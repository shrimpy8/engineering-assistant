'use client';

import Link from 'next/link';

/**
 * How It Works Page
 * Visual explanation of the Engineering Assistant architecture and key concepts
 */
export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)]">
      {/* Header */}
      <header className="border-b border-[var(--color-border)] bg-[var(--color-bg-primary)] sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
              </svg>
            </div>
            <span className="font-bold text-[var(--color-text-primary)]">Engineering Assistant</span>
          </Link>
          <Link
            href="/"
            className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-accent)] text-white font-medium hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            Try It Now
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-[var(--color-text-primary)] mb-6">
            How It Works
          </h1>
          <p className="text-xl text-[var(--color-text-secondary)] max-w-2xl mx-auto">
            A local-first AI assistant that helps you understand codebases through
            <span className="text-[var(--color-accent)] font-medium"> transparent</span>,
            <span className="text-green-500 font-medium"> secure</span>, and
            <span className="text-purple-500 font-medium"> private</span> tooling.
          </p>
        </div>
      </section>

      {/* Architecture Flow */}
      <section className="py-12 px-4 bg-[var(--color-bg-secondary)]">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-4">
            Architecture Overview
          </h2>
          <p className="text-center text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto">
            Two modes, same powerful tools. Choose local privacy or enhanced reasoning.
          </p>

          {/* Two Architecture Diagrams */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Web App Architecture */}
            <div className="p-6 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🏠</span>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Web App Mode</h3>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-green-500/10 text-green-500 rounded-full">100% Local</span>
              </div>

              {/* Web App Flow Diagram */}
              <div className="space-y-4">
                {/* Row 1: User & Browser */}
                <div className="flex items-center justify-center gap-3">
                  <ArchBlock icon="👤" label="You" sublabel="Browser" color="blue" />
                  <ArchArrowRight />
                  <ArchBlock icon="🖥️" label="Next.js UI" sublabel="React + Tailwind" color="blue" />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 2: API Layer */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="🔌" label="REST API" sublabel="SSE Streaming" color="purple" wide />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 3: Orchestrator */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="🎯" label="Orchestrator" sublabel="Tool Router + Prompt Builder" color="purple" wide />
                </div>

                {/* Arrow Down with Split */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 4: LLM + Tools */}
                <div className="flex items-center justify-center gap-3">
                  <ArchBlock icon="🧠" label="Ollama" sublabel="llama3.1:8b" color="green" />
                  <div className="text-[var(--color-text-tertiary)] text-xs">↔</div>
                  <ArchBlock icon="🔧" label="MCP Tools" sublabel="Embedded Client" color="green" />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 5: Repository */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="📁" label="Your Repository" sublabel="Read-Only Sandbox" color="orange" wide />
                </div>
              </div>

              <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-6">
                All processing on your machine. No internet required.
              </p>
            </div>

            {/* Claude Code Architecture */}
            <div className="p-6 rounded-2xl bg-[var(--color-bg-primary)] border border-[var(--color-border)] shadow-sm">
              <div className="flex items-center gap-2 mb-6">
                <span className="text-2xl">🚀</span>
                <h3 className="text-lg font-bold text-[var(--color-text-primary)]">Claude Code Mode</h3>
                <span className="ml-auto px-2 py-1 text-xs font-medium bg-purple-500/10 text-purple-500 rounded-full">Enhanced LLM</span>
              </div>

              {/* Claude Code Flow Diagram */}
              <div className="space-y-4">
                {/* Row 1: User & CLI */}
                <div className="flex items-center justify-center gap-3">
                  <ArchBlock icon="👤" label="You" sublabel="Terminal" color="blue" />
                  <ArchArrowRight />
                  <ArchBlock icon="⌨️" label="Claude Code" sublabel="CLI Tool" color="blue" />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 2: Claude LLM */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="🧠" label="Claude (Anthropic)" sublabel="Cloud API" color="purple" wide />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 3: MCP Protocol */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="📡" label="MCP Protocol" sublabel="JSON-RPC over stdio" color="purple" wide />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 4: MCP Server */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="🔧" label="MCP Server" sublabel="Subprocess" color="green" wide />
                </div>

                {/* Arrow Down */}
                <div className="flex justify-center">
                  <ArchArrowDown />
                </div>

                {/* Row 5: Repository */}
                <div className="flex items-center justify-center">
                  <ArchBlock icon="📁" label="Your Repository" sublabel="Read-Only Sandbox" color="orange" wide />
                </div>
              </div>

              <p className="text-center text-xs text-[var(--color-text-tertiary)] mt-6">
                Superior reasoning via Anthropic API. Same secure tools.
              </p>
            </div>
          </div>

          {/* Shared Components Callout */}
          <div className="mt-8 p-4 rounded-xl bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20">
            <div className="flex items-center justify-center gap-3 text-sm">
              <span className="text-green-500 font-semibold">Shared:</span>
              <span className="text-[var(--color-text-secondary)]">Same MCP tools</span>
              <span className="text-[var(--color-text-tertiary)]">•</span>
              <span className="text-[var(--color-text-secondary)]">Same security sandbox</span>
              <span className="text-[var(--color-text-tertiary)]">•</span>
              <span className="text-[var(--color-text-secondary)]">Same read-only access</span>
            </div>
          </div>
        </div>
      </section>

      {/* Key Concepts */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-12">
            Key Concepts
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <ConceptCard
              icon="🔗"
              title="Model Context Protocol (MCP)"
              description="An open protocol that standardizes how AI models interact with external tools and data sources. Instead of proprietary integrations, MCP provides a universal interface."
              highlight="Industry standard for AI tool integration"
              color="blue"
            />

            <ConceptCard
              icon="🔧"
              title="Native Tool Calling"
              description="The LLM decides when to use tools based on your question. It can read files, search code, and explore project structure—all through structured function calls."
              highlight="AI autonomously chooses the right tools"
              color="purple"
            />

            <ConceptCard
              icon="🔒"
              title="Sandboxed Access"
              description="All file operations are read-only and restricted to your selected repository. Path traversal attacks are prevented through strict validation."
              highlight="Security as a feature, not a constraint"
              color="green"
            />

            <ConceptCard
              icon="📡"
              title="SSE Streaming"
              description="Responses stream in real-time using Server-Sent Events. You see the AI thinking and tool results as they happen, not after a long wait."
              highlight="Real-time transparency"
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Tool Trace Explanation */}
      <section className="py-16 px-4 bg-[var(--color-bg-secondary)]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-4">
            Transparency Over Magic
          </h2>
          <p className="text-center text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto">
            The Tool Trace panel shows every action the AI takes. You always know exactly what files were read.
          </p>

          {/* Mock Tool Trace */}
          <div className="max-w-md mx-auto bg-[var(--color-bg-primary)] rounded-xl border border-[var(--color-border)] overflow-hidden shadow-lg">
            <div className="px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-bg-tertiary)]">
              <span className="text-sm font-semibold text-[var(--color-text-primary)]">Tool Trace</span>
            </div>
            <div className="p-4 space-y-3">
              <ToolTraceItem
                tool="get_repo_overview"
                status="completed"
                detail="Analyzed 47 files"
              />
              <ToolTraceItem
                tool="read_file"
                status="completed"
                detail="package.json"
              />
              <ToolTraceItem
                tool="search_files"
                status="completed"
                detail='Pattern: "useState"'
              />
            </div>
          </div>
        </div>
      </section>

      {/* Available Tools */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-12">
            Available Tools
          </h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ToolCard
              name="get_repo_overview"
              description="Scans repository structure, detects tech stack, counts files by type"
              icon="📊"
            />
            <ToolCard
              name="list_files"
              description="Lists files and directories at a given path with metadata"
              icon="📁"
            />
            <ToolCard
              name="read_file"
              description="Reads the contents of a specific file with line numbers"
              icon="📄"
            />
            <ToolCard
              name="search_files"
              description="Searches for regex patterns across all files in the repo"
              icon="🔍"
            />
          </div>
        </div>
      </section>

      {/* Request Flow */}
      <section className="py-16 px-4 bg-[var(--color-bg-secondary)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-12">
            What Happens When You Ask a Question
          </h2>

          <div className="space-y-6">
            <StepItem
              number={1}
              title="Your question is sent to the Orchestrator"
              description="The frontend sends your message to the /api/v1/chat/completions endpoint via a POST request."
            />
            <StepItem
              number={2}
              title="Orchestrator builds the context"
              description="A system prompt is constructed with your repo path, available tools, and instructions for the LLM."
            />
            <StepItem
              number={3}
              title="Ollama processes with tool awareness"
              description="The local LLM (llama3.1:8b) analyzes your question and decides which tools to call."
            />
            <StepItem
              number={4}
              title="Tools execute and return results"
              description="MCP tools run locally, reading files or searching code. Results are streamed back via SSE."
            />
            <StepItem
              number={5}
              title="LLM synthesizes the final response"
              description="With tool results in context, the LLM generates a helpful answer about your codebase."
            />
          </div>
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-12">
            Tech Stack
          </h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <TechBadge name="Next.js 15" category="Frontend" />
            <TechBadge name="React 19" category="UI" />
            <TechBadge name="TypeScript" category="Language" />
            <TechBadge name="Tailwind CSS" category="Styling" />
            <TechBadge name="Ollama" category="LLM Runtime" />
            <TechBadge name="MCP" category="Protocol" />
            <TechBadge name="SSE" category="Streaming" />
            <TechBadge name="Zod" category="Validation" />
          </div>
        </div>
      </section>

      {/* Claude Code Integration */}
      <section className="py-16 px-4">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] text-center mb-4">
            Two Ways to Run
          </h2>
          <p className="text-center text-[var(--color-text-secondary)] mb-12 max-w-2xl mx-auto">
            Use the local web app with Ollama, or connect the MCP server to Claude Code for a more powerful LLM.
          </p>

          {/* Comparison Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-border)]">
                  <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">Mode</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">LLM</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">Tools</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">Interface</th>
                  <th className="py-3 px-4 text-left text-sm font-semibold text-[var(--color-text-primary)]">Use Case</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-bg-secondary)]">
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-text-primary)]">Web App</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">Ollama (local)</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">Embedded MCP</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">Next.js UI</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">100% private, local-first</td>
                </tr>
                <tr className="border-b border-[var(--color-border)]">
                  <td className="py-3 px-4 text-sm font-medium text-[var(--color-text-primary)]">Claude Code</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">Claude (Anthropic)</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">MCP Server</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">CLI</td>
                  <td className="py-3 px-4 text-sm text-[var(--color-text-secondary)]">More capable LLM</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Benefits */}
          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🏠</span>
                <h3 className="font-semibold text-[var(--color-text-primary)]">Web App Mode</h3>
              </div>
              <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
                <li>• Runs entirely on your machine</li>
                <li>• No API costs or internet required</li>
                <li>• Visual tool trace panel</li>
                <li>• Great for privacy-sensitive code</li>
              </ul>
            </div>
            <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xl">🚀</span>
                <h3 className="font-semibold text-[var(--color-text-primary)]">Claude Code Mode</h3>
              </div>
              <ul className="text-sm text-[var(--color-text-secondary)] space-y-1">
                <li>• Superior reasoning capabilities</li>
                <li>• True MCP protocol over subprocess</li>
                <li>• Same sandboxed, read-only tools</li>
                <li>• Integrates with Claude Code workflow</li>
              </ul>
            </div>
          </div>

          <p className="text-center text-sm text-[var(--color-text-tertiary)] mt-6">
            See the{' '}
            <a
              href="https://github.com/shrimpy8/engineering-assistant/blob/main/docs/claude-code-integration.md"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              Claude Code Integration Guide
            </a>
            {' '}for setup instructions.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4 bg-gradient-to-br from-[var(--color-accent)]/10 to-purple-600/10">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl font-bold text-[var(--color-text-primary)] mb-4">
            Ready to Explore Your Codebase?
          </h2>
          <p className="text-[var(--color-text-secondary)] mb-8">
            Start asking questions about any repository. It&apos;s 100% local and private.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius-md)] bg-gradient-to-r from-[var(--color-accent)] to-purple-600 text-white font-semibold shadow-lg shadow-[var(--color-accent)]/30 hover:shadow-xl hover:shadow-[var(--color-accent)]/40 transition-all"
          >
            <span>Get Started</span>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-[var(--color-border)]">
        <div className="max-w-5xl mx-auto text-center text-sm text-[var(--color-text-tertiary)]">
          <p>Built to demonstrate modern developer tooling practices.</p>
          <p className="mt-2">
            <a
              href="https://github.com/shrimpy8/engineering-assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent)] hover:underline"
            >
              View on GitHub
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

// Component: Flow Node
function FlowNode({ icon, title, subtitle, color, small }: {
  icon: string;
  title: string;
  subtitle: string;
  color: 'blue' | 'purple' | 'green';
  small?: boolean;
}) {
  const colors = {
    blue: 'from-blue-500/20 to-blue-600/10 border-blue-500/30',
    purple: 'from-purple-500/20 to-purple-600/10 border-purple-500/30',
    green: 'from-green-500/20 to-green-600/10 border-green-500/30',
  };

  return (
    <div className={`
      ${small ? 'px-3 py-2' : 'px-4 py-3'}
      rounded-xl bg-gradient-to-br ${colors[color]} border
      text-center min-w-[100px]
    `}>
      <div className={`${small ? 'text-xl' : 'text-2xl'} mb-1`}>{icon}</div>
      <div className={`${small ? 'text-xs' : 'text-sm'} font-semibold text-[var(--color-text-primary)]`}>{title}</div>
      <div className={`${small ? 'text-[10px]' : 'text-xs'} text-[var(--color-text-tertiary)]`}>{subtitle}</div>
    </div>
  );
}

// Component: Flow Arrow
function FlowArrow() {
  return (
    <div className="text-[var(--color-text-tertiary)] hidden md:block">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );
}

// Component: Concept Card
function ConceptCard({ icon, title, description, highlight, color }: {
  icon: string;
  title: string;
  description: string;
  highlight: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colors = {
    blue: 'border-blue-500/30 hover:border-blue-500/50',
    purple: 'border-purple-500/30 hover:border-purple-500/50',
    green: 'border-green-500/30 hover:border-green-500/50',
    orange: 'border-orange-500/30 hover:border-orange-500/50',
  };

  const highlightColors = {
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    green: 'text-green-400',
    orange: 'text-orange-400',
  };

  return (
    <div className={`p-6 rounded-xl bg-[var(--color-bg-secondary)] border ${colors[color]} transition-colors`}>
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-lg font-semibold text-[var(--color-text-primary)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-text-secondary)] mb-3">{description}</p>
      <p className={`text-xs font-medium ${highlightColors[color]}`}>{highlight}</p>
    </div>
  );
}

// Component: Tool Trace Item (mock)
function ToolTraceItem({ tool, status, detail }: { tool: string; status: string; detail: string }) {
  return (
    <div className="flex items-center gap-3 p-2 rounded-lg bg-[var(--color-bg-secondary)]">
      <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center">
        <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-[var(--color-text-primary)]">{tool}</div>
        <div className="text-xs text-[var(--color-text-tertiary)] truncate">{detail}</div>
      </div>
    </div>
  );
}

// Component: Tool Card
function ToolCard({ name, description, icon }: { name: string; description: string; icon: string }) {
  return (
    <div className="p-4 rounded-xl bg-[var(--color-bg-secondary)] border border-[var(--color-border)] hover:border-[var(--color-accent)]/50 transition-colors">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-sm font-mono font-semibold text-[var(--color-accent)] mb-1">{name}</div>
      <p className="text-xs text-[var(--color-text-secondary)]">{description}</p>
    </div>
  );
}

// Component: Step Item
function StepItem({ number, title, description }: { number: number; title: string; description: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-[var(--color-accent)] to-purple-600 flex items-center justify-center text-white font-bold">
        {number}
      </div>
      <div className="flex-1 pt-1">
        <h3 className="font-semibold text-[var(--color-text-primary)] mb-1">{title}</h3>
        <p className="text-sm text-[var(--color-text-secondary)]">{description}</p>
      </div>
    </div>
  );
}

// Component: Tech Badge
function TechBadge({ name, category }: { name: string; category: string }) {
  return (
    <div className="p-3 rounded-lg bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-center">
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{name}</div>
      <div className="text-xs text-[var(--color-text-tertiary)]">{category}</div>
    </div>
  );
}

// Component: Architecture Block
function ArchBlock({ icon, label, sublabel, color, wide }: {
  icon: string;
  label: string;
  sublabel: string;
  color: 'blue' | 'purple' | 'green' | 'orange';
  wide?: boolean;
}) {
  const colors = {
    blue: 'bg-blue-500/10 border-blue-500/30',
    purple: 'bg-purple-500/10 border-purple-500/30',
    green: 'bg-green-500/10 border-green-500/30',
    orange: 'bg-orange-500/10 border-orange-500/30',
  };

  return (
    <div className={`
      ${wide ? 'px-6 py-3 min-w-[200px]' : 'px-4 py-3 min-w-[120px]'}
      rounded-lg border ${colors[color]} text-center
    `}>
      <div className="text-xl mb-1">{icon}</div>
      <div className="text-sm font-semibold text-[var(--color-text-primary)]">{label}</div>
      <div className="text-xs text-[var(--color-text-tertiary)]">{sublabel}</div>
    </div>
  );
}

// Component: Architecture Arrow Right
function ArchArrowRight() {
  return (
    <div className="text-[var(--color-text-tertiary)]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
      </svg>
    </div>
  );
}

// Component: Architecture Arrow Down
function ArchArrowDown() {
  return (
    <div className="text-[var(--color-text-tertiary)]">
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
      </svg>
    </div>
  );
}
