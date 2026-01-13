# Architecture Overview

**Version:** 1.1.0
**Last Updated:** January 11, 2026 (Updated for shared tools module)

This document describes the system architecture of the Engineering Assistant, a local-first AI assistant for codebase analysis.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [Component Architecture](#component-architecture)
4. [Data Flow](#data-flow)
5. [Directory Structure](#directory-structure)
6. [Key Design Decisions](#key-design-decisions)
7. [Security Architecture](#security-architecture)

---

## System Overview

### Design Philosophy

The Engineering Assistant follows these core principles:

| Principle | Implementation |
|-----------|----------------|
| **Local-First** | All processing on user's machine, no cloud dependencies |
| **Transparent** | Every AI action visible in the Tool Trace |
| **Secure** | Sandboxed file access, read-only operations |
| **Standard** | Uses MCP protocol, not proprietary tool schemas |

### Technology Stack

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend Layer                           │
│  Next.js 14+ (App Router) • React 19 • Tailwind CSS            │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        API Layer                                │
│  REST API (Stripe-style) • SSE Streaming • Zod Validation      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                     Backend Services                            │
│  Ollama Client • MCP Client • Chat Orchestrator                 │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    External Services                            │
│  Ollama (Local LLM) • MCP Server (File Access)                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Architecture Diagram

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              User's Browser                                  │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         React Application                            │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────────────────┐  │   │
│  │  │ ChatContainer │ │SettingsPanel│ │      ToolTracePanel        │  │   │
│  │  │             │  │             │  │                            │  │   │
│  │  │ • MessageList │ │ • RepoPath  │ │ • Real-time tool events   │  │   │
│  │  │ • ChatInput   │ │ • Model     │ │ • Status indicators       │  │   │
│  │  │ • Typing     │ │ • Temp      │ │ • Expandable results      │  │   │
│  │  └─────────────┘  └─────────────┘  └────────────────────────────┘  │   │
│  │                                                                      │   │
│  │  ┌────────────────────────────────────────────────────────────────┐ │   │
│  │  │                      React Hooks                                │ │   │
│  │  │   useChat    •    useSettings    •    useToolTrace             │ │   │
│  │  └────────────────────────────────────────────────────────────────┘ │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                     │
                                     │ HTTP/SSE
                                     ↓
┌─────────────────────────────────────────────────────────────────────────────┐
│                           Next.js Server                                     │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                         API Routes                                   │    │
│  │   /api/v1/health  •  /api/v1/models  •  /api/v1/models/pull (SSE)   │    │
│  │   /api/v1/prompt  •  /api/v1/chat/completions (SSE)                 │    │
│  └────────────────────────────────────────────────────────────────────┘    │
│                                     │                                       │
│  ┌────────────────────────────────────────────────────────────────────┐    │
│  │                        Core Libraries                                │    │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │    │
│  │  │ Ollama Client │  │  MCP Client  │  │  Orchestrator │             │    │
│  │  │              │  │              │  │              │             │    │
│  │  │ • /api/chat  │  │ • Tool calls │  │ • Prompt eng│             │    │
│  │  │ • /api/tags  │  │ • Sandboxing │  │ • Tool loop │             │    │
│  │  └──────────────┘  └──────────────┘  └──────────────┘             │    │
│  └────────────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────────┘
          │                           │
          │ HTTP                      │ Direct function calls
          ↓                           ↓
┌────────────────────┐      ┌────────────────────────────────────────────────┐
│      Ollama        │      │        MCP Client (Local-First)                 │
│                    │      │                                                 │
│ • llama3.1:8b      │      │  ┌────────────────────────────────────────┐   │
│ • codellama:7b     │      │  │              MCP Tools                  │   │
│ • qwen2:7b         │      │  │                                         │   │
│                    │      │  │ list_files • read_file • search_files  │   │
│ (Local inference)  │      │  │             get_repo_overview           │   │
│                    │      │  └────────────────────────────────────────┘   │
└────────────────────┘      │                       │                        │
                            │                       ↓                        │
                            │  ┌────────────────────────────────────────┐   │
                            │  │          Path Validator                 │   │
                            │  │  • Sandbox enforcement                  │   │
                            │  │  • Symlink resolution                   │   │
                            │  │  • Traversal prevention                 │   │
                            │  └────────────────────────────────────────┘   │
                            │                       │                        │
                            │                       ↓                        │
                            │  ┌────────────────────────────────────────┐   │
                            │  │            File System                  │   │
                            │  │         (Sandboxed Access)              │   │
                            │  └────────────────────────────────────────┘   │
                            └────────────────────────────────────────────────┘
```

### Request Flow Diagram

```
User Input                Chat Completions API               Ollama          MCP Server
    │                            │                             │                  │
    │  "Explain auth flow"       │                             │                  │
    │ ─────────────────────────→ │                             │                  │
    │                            │                             │                  │
    │                            │  POST /api/chat             │                  │
    │                            │ ──────────────────────────→ │                  │
    │                            │                             │                  │
    │                            │  ← streaming response ──────│                  │
    │                            │   (tool_call: search_files) │                  │
    │                            │                             │                  │
    │  SSE: tool_call started    │                             │                  │
    │ ←───────────────────────── │                             │                  │
    │                            │                             │                  │
    │                            │  JSON-RPC: search_files     │                  │
    │                            │ ────────────────────────────│────────────────→ │
    │                            │                             │                  │
    │                            │  ← results ─────────────────│──────────────────│
    │                            │                             │                  │
    │  SSE: tool_call completed  │                             │                  │
    │ ←───────────────────────── │                             │                  │
    │                            │                             │                  │
    │                            │  POST /api/chat (continue)  │                  │
    │                            │ ──────────────────────────→ │                  │
    │                            │                             │                  │
    │  SSE: content chunks       │  ← streaming response ──────│                  │
    │ ←───────────────────────── │                             │                  │
    │                            │                             │                  │
    │  SSE: done                 │                             │                  │
    │ ←───────────────────────── │                             │                  │
    │                            │                             │                  │
```

---

## Component Architecture

### Frontend Components

```
src/components/
├── ui/                          # Primitive UI components
│   ├── Button.tsx               # Primary, secondary, ghost, danger variants
│   ├── Input.tsx                # Text input with error state
│   ├── Spinner.tsx              # Loading indicator
│   └── ErrorDisplay.tsx         # User-friendly error messages
│
├── chat/                        # Chat interface components
│   ├── ChatContainer.tsx        # Main container with layout
│   ├── MessageList.tsx          # Scrollable message list
│   ├── MessageBubble.tsx        # Individual message display
│   ├── ChatInput.tsx            # Auto-expanding textarea
│   └── TypingIndicator.tsx      # Three-dot animation
│
├── settings/                    # Configuration components
│   ├── SettingsPanel.tsx        # Slide-in panel (360px)
│   ├── RepoPathInput.tsx        # Path input with validation
│   └── ModelSelector.tsx        # Model dropdown
│
├── trace/                       # Tool trace components
│   ├── ToolTracePanel.tsx       # Desktop sidebar (280px)
│   ├── ToolTraceItem.tsx        # Individual tool call display
│   └── ToolTraceSheet.tsx       # Mobile bottom sheet
│
└── ErrorBoundary.tsx            # React error boundary
```

### State Management

```
src/hooks/
├── useChat.ts                   # Chat messages and streaming
│   ├── messages: Message[]      # Conversation history
│   ├── isLoading: boolean       # Request in progress
│   ├── isStreaming: boolean     # SSE stream active
│   ├── error: Error | null      # Current error
│   └── sendMessage(content)     # Send new message
│
├── useSettings.ts               # User preferences (persisted)
│   ├── settings: Settings       # Current settings
│   ├── updateSettings(partial)  # Update preferences
│   ├── models: OllamaModel[]    # Available models
│   └── refreshModels()          # Reload model list
│
└── useToolTrace.ts              # Tool execution events
    ├── events: ToolTraceEvent[] # Tool call history
    ├── addEvent(event)          # Add new event
    └── clearEvents()            # Reset trace
```

### API Routes

```
src/app/api/v1/
├── health/route.ts              # GET - Service health check
│   └── Response: { status, services: { ollama, mcp } }
│
├── models/route.ts              # GET - List Ollama models
│   └── Response: { models: [...] }
│
├── files/route.ts               # GET - List repository files
│   └── Query: repo, path
│
├── files/read/route.ts          # POST - Read file contents
│   ├── Request: { path, repo_path, max_bytes? }
│   └── Response: { path, content, size, modified_at, truncated }
│
└── chat/completions/route.ts    # POST - Chat with streaming
    ├── Request: { messages, repo_path, model, stream, tool_mode }
    └── Response: SSE stream with tool lifecycle events
```

### Library Modules

```
src/lib/
├── config/                      # Application configuration
│   └── index.ts                 # Environment variables, defaults
│
├── errors/                      # Error handling
│   ├── codes.ts                 # Error code definitions
│   ├── messages.ts              # User-facing messages
│   └── handlers.ts              # Error transformation
│
├── logger/                      # Structured logging
│   └── index.ts                 # Pino logger setup
│
├── ollama/                      # Ollama integration
│   ├── client.ts                # HTTP client
│   └── types.ts                 # TypeScript definitions
│
├── tools/                       # Shared tool implementations
│   ├── types.ts                 # Tool parameter/result types
│   ├── core.ts                  # Tool logic (listFiles, readFile, etc.)
│   └── index.ts                 # Barrel exports
│
├── mcp/                         # MCP client module
│   ├── client.ts                # Tool execution client
│   ├── protocol.ts              # MCP protocol definitions
│   ├── types.ts                 # TypeScript definitions
│   └── index.ts                 # Barrel exports
│
└── orchestrator/                # Chat orchestration
    ├── promptBuilder.ts         # System prompt construction
    ├── toolRouter.ts            # Tool call routing
    └── index.ts                 # Orchestrator entry point
```

**Environment note:** `DEV_DISABLE_SANDBOX` and `DEV_MOCK_OLLAMA` are dev-only flags.
Leaving them enabled during production builds will emit warnings.

---

## Data Flow

### Chat Message Flow

```
1. User Input
   └─→ ChatInput component captures text
       └─→ useChat.sendMessage() called

2. API Request
   └─→ POST /api/v1/chat/completions
       └─→ Validates request with Zod
           └─→ Initializes SSE stream

3. Ollama Inference
   └─→ Sends prompt (tools only in auto mode)
       └─→ Model returns response (may include tool calls)

4. Tool Execution (if needed)
   └─→ SSE: tool_call started event
       └─→ MCP client executes tool
           └─→ SSE: tool_call completed event
               └─→ Resume Ollama with tool result

5. Response Assembly
   └─→ SSE: OpenAI-compatible content chunks
       └─→ SSE: tool_call lifecycle events (custom)
           └─→ SSE: done event with usage stats
               └─→ useChat updates messages state

6. UI Update
   └─→ MessageList re-renders
       └─→ ToolTracePanel shows tool activity

**Streaming Note:** The SSE stream mixes OpenAI-compatible content chunks with
custom tool lifecycle events. The UI listens for both to render tokens and show
tool activity in real time.
```

### Settings Persistence Flow

```
1. User Changes Setting
   └─→ SettingsPanel captures change
       └─→ useSettings.updateSettings() called

2. Validation
   └─→ Zod schema validates settings
       └─→ If repo_path: validate with API

3. Persistence
   └─→ localStorage.setItem('settings', JSON.stringify)
       └─→ State updated

4. Restoration (on load)
   └─→ useSettings initializes
       └─→ localStorage.getItem('settings')
           └─→ Parse and validate
               └─→ If repo_path invalid: clear + prompt user
               └─→ Set initial state
```

---

## Directory Structure

```
engineering-assistant/
├── src/
│   ├── app/                     # Next.js App Router
│   │   ├── api/v1/              # REST API routes
│   │   ├── layout.tsx           # Root layout with ErrorBoundary
│   │   ├── page.tsx             # Main chat page
│   │   └── globals.css          # Tailwind and custom styles
│   │
│   ├── components/              # React components
│   │   ├── ui/                  # Primitives (Button, Input, etc.)
│   │   ├── chat/                # Chat interface
│   │   ├── settings/            # Configuration panel
│   │   └── trace/               # Tool trace display
│   │
│   ├── hooks/                   # React hooks
│   │   ├── useChat.ts           # Chat state management
│   │   ├── useSettings.ts       # Settings persistence
│   │   └── useToolTrace.ts      # Tool event tracking
│   │
│   ├── lib/                     # Core libraries
│   │   ├── config/              # Configuration
│   │   ├── errors/              # Error handling
│   │   ├── logger/              # Logging
│   │   ├── ollama/              # Ollama client
│   │   ├── tools/               # Shared tool implementations
│   │   ├── mcp/                 # MCP client module
│   │   └── orchestrator/        # Chat orchestration
│   │
│   └── types/                   # TypeScript definitions
│       ├── api.ts               # API response types
│       ├── chat.ts              # Chat/SSE types
│       └── mcp.ts               # MCP tool types
│
├── mcp-server/                  # MCP Server (separate package)
│   └── src/
│       ├── server.ts            # Server initialization
│       ├── tools/               # Tool implementations
│       ├── shared/              # Shared tools copy (see TECH_DEBT.md)
│       ├── validation/          # Path & input validation
│       └── errors/              # MCP error classes
│
├── e2e/                         # Playwright E2E tests
│   ├── chat-workflow.spec.ts    # Chat interface tests
│   └── error-handling.spec.ts   # Error scenario tests
│
├── __tests__/                   # Unit & integration tests
│   ├── unit/                    # Unit tests
│   └── integration/             # Integration tests
│
├── docs/                        # Documentation
│   ├── API.md                   # REST API reference
│   ├── MCP.md                   # MCP tools reference
│   └── ARCHITECTURE.md          # This document
│
├── playwright.config.ts         # E2E test configuration
├── vitest.config.ts             # Unit test configuration
├── package.json                 # Dependencies and scripts
├── CLAUDE.md                    # Project principles
├── PROGRESS.md                  # Milestone tracking
└── TECH_DEBT.md                 # Technical debt registry
```

---

## Key Design Decisions

### 1. Local-First Architecture

**Decision:** All inference and file access happens locally.

**Rationale:**
- Privacy: User code never leaves their machine
- Speed: No network latency for file operations
- Reliability: Works offline

**Trade-offs:**
- Requires Ollama installation
- Limited by local compute resources

### 2. MCP for Tool Access

**Decision:** Use Model Context Protocol instead of custom tool schema.

**Rationale:**
- Standardization: MCP is becoming industry standard
- Interoperability: Tools work with any MCP-compatible client
- Future-proofing: Easy to add new tools or swap providers

**Trade-offs:**
- Additional process (MCP server)
- JSON-RPC overhead

### 3. SSE for Streaming

**Decision:** Server-Sent Events for chat streaming.

**Rationale:**
- Simplicity: Native browser support
- Reliability: Auto-reconnection built-in
- Compatibility: Works through proxies/CDNs

**Trade-offs:**
- One-directional (server → client)
- Less efficient than WebSockets for bidirectional

### 4. Stripe-Style API Design

**Decision:** Consistent response shapes with success/error envelopes.

**Rationale:**
- Predictability: Same shape for all endpoints
- Debuggability: Request IDs for tracing
- Documentation: Self-describing responses

### 5. React Hooks for State

**Decision:** Custom hooks instead of state management library.

**Rationale:**
- Simplicity: No external dependencies
- Scope: State needs are well-contained
- Maintainability: Clear ownership per hook

**Trade-offs:**
- No time-travel debugging
- Manual optimization needed

---

## Security Architecture

### Defense in Depth

```
┌─────────────────────────────────────────────────────────────┐
│                    Layer 1: Input Validation                 │
│  • Zod schema validation on all API inputs                  │
│  • Type checking at runtime                                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Layer 2: Path Validation                  │
│  • Absolute path normalization                              │
│  • Traversal sequence detection (../)                       │
│  • Real path resolution                                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Layer 3: Sandbox Enforcement              │
│  • ALLOWED_REPO_ROOT boundary check                         │
│  • Symlink target validation                                │
│  • Final path must be under allowed root                    │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    Layer 4: Operation Control                │
│  • Read-only operations only (v1)                           │
│  • File size limits                                          │
│  • Search timeout limits                                     │
└─────────────────────────────────────────────────────────────┘
```

### Threat Model

| Threat | Mitigation |
|--------|------------|
| Path traversal | Multi-layer path validation |
| Symlink escape | Real path resolution and validation |
| Large file DoS | File size limits |
| Search DoS | Timeout and result limits |
| Arbitrary code exec | No command execution, read-only |
| Sensitive file access | Sandbox to repo root only |

---

*Last updated: January 11, 2026*
