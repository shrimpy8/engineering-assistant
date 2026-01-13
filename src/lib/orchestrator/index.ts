/**
 * Chat Orchestrator
 *
 * Main orchestration logic for the engineering assistant chat flow.
 * Coordinates between LLM, MCP tools, and response streaming.
 *
 * Based on PRD v1.4 Section 5.4
 */

import { OllamaClient } from '@/lib/ollama/client';
import type { OllamaChatMessage } from '@/lib/ollama/types';
import { getMCPClient, MCPClient } from '@/lib/mcp/client';
import type { ToolCallEvent, ToolResult } from '@/lib/mcp/types';
import {
  PromptBuilder,
  createPromptBuilder,
  type PromptBuilderOptions,
} from './promptBuilder';
import {
  ToolRouter,
  createToolRouter,
  parseToolCalls,
  hasToolCalls,
  type ToolCallResult,
  type ToolEventEmitter,
} from './toolRouter';
import { logger } from '@/lib/logger';
import { config } from '@/lib/config';

// =============================================================================
// Types
// =============================================================================

/**
 * Chat message format
 */
export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

/**
 * Orchestrator configuration
 */
export interface OrchestratorConfig {
  model: string;
  repoPath?: string;
  toolMode: 'auto' | 'manual';
  temperature?: number;
  maxTokens?: number;
  maxToolIterations?: number;
}

/**
 * SSE Event types for streaming
 * PRD Reference: Section 6.4.1.1
 */
export type SSEEvent =
  | { type: 'content'; delta: string }
  | ToolCallEvent
  | { type: 'done'; usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }
  | { type: 'error'; error: { code: string; message: string } };

/**
 * Orchestration result for non-streaming
 */
export interface OrchestrationResult {
  content: string;
  toolCalls: ToolCallResult[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// =============================================================================
// Orchestrator Class
// =============================================================================

/**
 * Main orchestrator for the engineering assistant
 *
 * Handles the complete flow:
 * 1. Build system prompt with tool definitions
 * 2. Send messages to LLM
 * 3. Detect and execute tool calls
 * 4. Loop back to LLM with tool results
 * 5. Stream or return final response
 */
export class Orchestrator {
  private ollamaClient: OllamaClient;
  private mcpClient: MCPClient | null = null;
  private promptBuilder: PromptBuilder;
  private toolRouter: ToolRouter | null = null;
  private config: OrchestratorConfig;

  constructor(orchestratorConfig: OrchestratorConfig) {
    this.config = {
      maxToolIterations: 5,
      ...orchestratorConfig,
    };

    this.ollamaClient = new OllamaClient({ baseUrl: config.ollamaBaseUrl });
    this.promptBuilder = createPromptBuilder({
      repoPath: orchestratorConfig.repoPath,
      toolMode: orchestratorConfig.toolMode,
    });
  }

  /**
   * Initialize MCP connection and pre-fetch repo overview
   */
  async initialize(): Promise<void> {
    if (!this.config.repoPath) {
      logger.info({}, 'No repo path configured, tool calls disabled');
      return;
    }

    try {
      this.mcpClient = await getMCPClient(this.config.repoPath);
      this.toolRouter = createToolRouter(this.mcpClient);
      logger.info(
        { repoPath: this.config.repoPath },
        'Orchestrator initialized with MCP client'
      );

      // Pre-fetch repo overview to inject into system prompt
      // This ensures the model knows the project structure before any questions
      await this.prefetchRepoOverview();
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to initialize MCP client'
      );
      // Continue without MCP - chat will work but tools won't
    }
  }

  /**
   * Pre-fetch repository overview and inject into prompt context
   * This ensures the model knows the project structure before the first question
   */
  private async prefetchRepoOverview(): Promise<void> {
    if (!this.mcpClient) return;

    try {
      logger.info({}, 'Pre-fetching repo overview for context injection');
      const result = await this.mcpClient.callTool('get_repo_overview', {
        max_depth: 3,
        include_stats: true,
      });

      if (result && typeof result === 'object') {
        // Format the overview for the system prompt
        const overview = JSON.stringify(result, null, 2);
        this.promptBuilder.setRepoOverview(overview);
        logger.info(
          { overviewLength: overview.length },
          'Repo overview pre-fetched and injected into prompt'
        );
      }
    } catch (error) {
      logger.warn(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Failed to pre-fetch repo overview, model will discover on first question'
      );
      // Non-fatal - model can still discover via tool calls
    }
  }

  /**
   * Stream chat completion with tool support
   *
   * @param messages - Chat messages
   * @param onEvent - Callback for SSE events
   */
  async streamChat(
    messages: ChatMessage[],
    onEvent: (event: SSEEvent) => void
  ): Promise<void> {
    // Initialize if needed
    if (this.config.repoPath && !this.mcpClient) {
      await this.initialize();
    }

    // Set up tool event forwarding
    if (this.toolRouter) {
      this.toolRouter.setEventEmitter((event) => {
        onEvent(event);
      });
    }

    // Build conversation with system prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const conversationMessages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let iterations = 0;
    let toolRounds = 0;
    const MAX_TOOL_ROUNDS = 2; // Allow 2 tool rounds for "try X, if fails try Y" pattern

    try {
      while (iterations < (this.config.maxToolIterations || 5)) {
        iterations++;

        // Call LLM - allow tools for up to MAX_TOOL_ROUNDS
        // This enables "try file A, if not found try file B" patterns
        const response = toolRounds >= MAX_TOOL_ROUNDS
          ? await this.callLLMWithoutTools(conversationMessages)
          : await this.callLLMWithTools(conversationMessages);

        totalPromptTokens += response.prompt_eval_count || 0;
        totalCompletionTokens += response.eval_count || 0;

        // Check for tool calls (only possible if tools were passed)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (toolRounds < MAX_TOOL_ROUNDS && hasToolCalls(response as any) && this.toolRouter) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const toolCalls = parseToolCalls(response as any);

          // Execute tool calls (events are emitted via toolRouter)
          const results = await this.toolRouter.executeToolCalls(toolCalls);
          toolRounds++;

          // Add tool results to conversation
          const toolResultContent = this.toolRouter.formatToolResultsForLLM(results);
          conversationMessages.push({
            role: 'assistant',
            content: response.message?.content || '',
          });
          conversationMessages.push({
            role: 'user',
            content: `Here are the results from the tools you called. Please summarize these results in a clear, human-readable way to answer my question. Do NOT describe the JSON structure or explain how to parse it - just tell me what was found.

${toolResultContent}

Now provide a helpful summary of what you found.`,
          });

          // Continue loop to get LLM response to tool results
          continue;
        }

        // No tool calls - emit the already-received content to avoid a second LLM call.
        const content = response.message?.content || '';
        if (content) {
          onEvent({
            type: 'content',
            delta: content,
          });
        }

        // Done
        onEvent({
          type: 'done',
          usage: {
            prompt_tokens: totalPromptTokens,
            completion_tokens: totalCompletionTokens,
            total_tokens: totalPromptTokens + totalCompletionTokens,
          },
        });

        return;
      }

      // Max iterations reached
      logger.warn({ iterations }, 'Max tool iterations reached');
      onEvent({
        type: 'error',
        error: {
          code: 'max_iterations',
          message: 'Maximum tool iterations reached',
        },
      });
    } catch (error) {
      logger.error(
        { error: error instanceof Error ? error.message : 'Unknown' },
        'Orchestration error'
      );

      onEvent({
        type: 'error',
        error: {
          code: 'orchestration_error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      });
    }
  }

  /**
   * Non-streaming chat completion
   */
  async chat(messages: ChatMessage[]): Promise<OrchestrationResult> {
    // Initialize if needed
    if (this.config.repoPath && !this.mcpClient) {
      await this.initialize();
    }

    // Build conversation with system prompt
    const systemPrompt = this.promptBuilder.buildSystemPrompt();
    const conversationMessages: OllamaChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({
        role: m.role as 'system' | 'user' | 'assistant',
        content: m.content,
      })),
    ];

    const allToolCalls: ToolCallResult[] = [];
    let totalPromptTokens = 0;
    let totalCompletionTokens = 0;
    let iterations = 0;
    let toolRounds = 0;
    const MAX_TOOL_ROUNDS = 2; // Allow 2 tool rounds for "try X, if fails try Y" pattern

    while (iterations < (this.config.maxToolIterations || 5)) {
      iterations++;

      // Call LLM - allow tools for up to MAX_TOOL_ROUNDS
      // This enables "try file A, if not found try file B" patterns
      const response = toolRounds >= MAX_TOOL_ROUNDS
        ? await this.callLLMWithoutTools(conversationMessages)
        : await this.callLLMWithTools(conversationMessages);

      totalPromptTokens += response.prompt_eval_count || 0;
      totalCompletionTokens += response.eval_count || 0;

      // Check for tool calls (only possible if tools were passed)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (toolRounds < MAX_TOOL_ROUNDS && hasToolCalls(response as any) && this.toolRouter) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const toolCalls = parseToolCalls(response as any);
        const results = await this.toolRouter.executeToolCalls(toolCalls);
        allToolCalls.push(...results);
        toolRounds++;

        // Add tool results to conversation
        const toolResultContent = this.toolRouter.formatToolResultsForLLM(results);
        conversationMessages.push({
          role: 'assistant',
          content: response.message?.content || '',
        });
        conversationMessages.push({
          role: 'user',
          content: `Here are the results from the tools you called. Please summarize these results in a clear, human-readable way to answer my question. Do NOT describe the JSON structure or explain how to parse it - just tell me what was found.

${toolResultContent}

Now provide a helpful summary of what you found.`,
        });

        continue;
      }

      // No tool calls - return the response
      return {
        content: response.message?.content || '',
        toolCalls: allToolCalls,
        usage: {
          prompt_tokens: totalPromptTokens,
          completion_tokens: totalCompletionTokens,
          total_tokens: totalPromptTokens + totalCompletionTokens,
        },
      };
    }

    throw new Error('Maximum tool iterations reached');
  }

  /**
   * Call LLM with tool definitions
   */
  private async callLLMWithTools(
    messages: OllamaChatMessage[]
  ): Promise<{
    message?: {
      content?: string;
      tool_calls?: Array<{
        function?: {
          name: string;
          arguments: string | Record<string, unknown>;
        };
      }>;
    };
    prompt_eval_count?: number;
    eval_count?: number;
  }> {
    const allowTools =
      this.config.toolMode === 'auto' ||
      (this.config.toolMode === 'manual' && this.shouldAllowToolsInManualMode(messages));

    // Only expose tools when allowed; manual mode requires explicit tool request.
    const tools = this.toolRouter && allowTools
      ? this.promptBuilder.getOllamaTools()
      : undefined;

    return this.ollamaClient.chat({
      model: this.config.model,
      messages,
      options: {
        temperature: this.config.temperature ?? 0.3,
        num_predict: this.config.maxTokens,
      },
      tools,
    });
  }

  /**
   * Manual tool mode: only allow tools when user explicitly asks for a tool call.
   */
  private shouldAllowToolsInManualMode(messages: OllamaChatMessage[]): boolean {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUserMessage?.content) return false;

    const content = lastUserMessage.content.toLowerCase();
    const toolNames = ['list_files', 'read_file', 'search_files', 'get_repo_overview'];
    return toolNames.some((name) => content.includes(name)) || content.includes('use tool');
  }

  /**
   * Call LLM without tool definitions (for follow-up after tool results)
   */
  private async callLLMWithoutTools(
    messages: OllamaChatMessage[]
  ): Promise<{
    message?: {
      content?: string;
    };
    prompt_eval_count?: number;
    eval_count?: number;
  }> {
    return this.ollamaClient.chat({
      model: this.config.model,
      messages,
      options: {
        temperature: this.config.temperature ?? 0.3,
        num_predict: this.config.maxTokens,
      },
      // No tools - force text response
    });
  }

  /**
   * Stream LLM response
   */
  private async streamLLMResponse(
    messages: OllamaChatMessage[],
    onEvent: (event: SSEEvent) => void
  ): Promise<void> {
    for await (const chunk of this.ollamaClient.chatStream({
      model: this.config.model,
      messages,
      options: {
        temperature: this.config.temperature ?? 0.3,
        num_predict: this.config.maxTokens,
      },
    })) {
      if (chunk.message?.content) {
        onEvent({
          type: 'content',
          delta: chunk.message.content,
        });
      }
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    if (this.mcpClient) {
      await this.mcpClient.disconnect();
      this.mcpClient = null;
      this.toolRouter = null;
    }
  }
}

// =============================================================================
// Factory Function
// =============================================================================

/**
 * Create an orchestrator instance
 */
export function createOrchestrator(
  config: Partial<OrchestratorConfig> & { model?: string }
): Orchestrator {
  return new Orchestrator({
    model: config.model || 'llama3.1:8b',
    repoPath: config.repoPath,
    toolMode: config.toolMode || 'auto',
    temperature: config.temperature,
    maxTokens: config.maxTokens,
    maxToolIterations: config.maxToolIterations,
  });
}

// =============================================================================
// Re-exports
// =============================================================================

export { PromptBuilder, createPromptBuilder } from './promptBuilder';
export { ToolRouter, createToolRouter, parseToolCalls, hasToolCalls } from './toolRouter';
export type { ToolCallResult, ParsedToolCall, ToolEventEmitter } from './toolRouter';
export type { PromptBuilderOptions } from './promptBuilder';
