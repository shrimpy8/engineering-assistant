# Engineering Assistant

A **local-first AI assistant** that helps developers understand codebases through transparent, secure, and well-designed tooling.

**100% Private** - Runs entirely on your machine using Ollama. No data leaves your computer.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-18%2B-green.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)

## Features

- **Chat with AI** about any codebase using local Ollama models
- **Transparent Tool Execution** - See every file the AI reads in the Tool Trace panel
- **Read-Only Sandboxed Access** - Secure, non-destructive exploration
- **SSE Streaming** - Real-time responses with tool lifecycle events
- **MCP Protocol** - Built on Model Context Protocol for standardization
- **Pre-loaded Context** - Repo structure is pre-fetched so the AI knows your project before you ask
- **How It Works Page** - Visual documentation at `/how-it-works` explaining the architecture

### Quick Start Questions

Click these suggested questions to explore any repository:

| Button | Question |
|--------|----------|
| 🛠️ Tech stack | What is the technology stack used in this project? |
| 📋 What is this project? | What is this project about? |
| 📁 Show structure | Show me the project structure |
| 🔍 Find main entry | Where is the main entry point? |
| 📦 List dependencies | What dependencies does this project use? |
| ⚙️ Explain codebase | Explain the codebase |

## Prerequisites

- **Node.js** 18+
- **npm** 9+
- **Ollama** running locally with a **tool-compatible model**

### Required: Tool-Compatible Models

This app uses Ollama's **native tool calling API** for file browsing. Only certain models properly support this.

**Verified working models:**

| Model | Size | Notes |
|-------|------|-------|
| `llama3.1:8b` | 4.9GB | **Recommended** - Best balance of capability and tool support |
| `llama3.2:3b` | 2.0GB | Faster, but may have stability issues |

**Models that do NOT work** (output JSON text instead of using tool_calls):
- `mistral:7b`, `qwen2.5-coder`, `deepseek-coder`, `codellama`

```bash
# Install Ollama (macOS)
brew install ollama

# Pull the recommended model
ollama pull llama3.1:8b
```

## Quick Start

```bash
# Clone the repository
git clone https://github.com/shrimpy8/engineering-assistant.git
cd engineering-assistant

# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:3000
```

## Project Structure

```
engineering-assistant/
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── api/v1/          # REST API endpoints
│   │   └── how-it-works/    # Visual architecture documentation
│   ├── components/          # React components
│   │   ├── chat/            # Chat UI components
│   │   ├── settings/        # Settings panel
│   │   ├── trace/           # Tool trace panel
│   │   └── ui/              # Reusable UI components
│   ├── hooks/               # React hooks (useChat, useSettings)
│   └── lib/                 # Core libraries
│       ├── tools/           # MCP tool implementations
│       ├── mcp/             # MCP client module
│       ├── orchestrator/    # Chat orchestration
│       └── ollama/          # Ollama integration
├── mcp-server/              # Standalone MCP server
├── config/                  # Configuration files
│   └── prompts/             # System prompts
└── docs/                    # Documentation
    ├── API.md               # REST API reference
    ├── MCP.md               # MCP tools reference
    └── ARCHITECTURE.md      # System architecture
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Service health check |
| `/api/v1/models` | GET | List available Ollama models |
| `/api/v1/models/pull` | POST | Pull Ollama model (SSE) |
| `/api/v1/files` | GET | List repository files |
| `/api/v1/files/read` | POST | Read file contents |
| `/api/v1/chat/completions` | POST | Chat with AI (SSE streaming) |
| `/api/v1/prompt` | GET | View system prompt |

See [docs/API.md](docs/API.md) for full documentation.

## MCP Tools

The AI assistant has access to four read-only tools:

| Tool | Description |
|------|-------------|
| `list_files` | List files and directories in a path |
| `read_file` | Read contents of a specific file |
| `search_files` | Search for patterns across files using regex |
| `get_repo_overview` | Get repository structure, stats, and tech detection |

See [docs/MCP.md](docs/MCP.md) for tool parameters and response formats.

## Configuration

Create a `.env.local` file (optional):

```bash
# Ollama configuration
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_DEFAULT_MODEL=llama3.1:8b

# Optional: Restrict repository access to a specific directory
ALLOWED_REPO_ROOT=/Users/yourname/projects
```

### LLM Settings

| Setting | Default | Notes |
|---------|---------|-------|
| Temperature | 0.3 | Lower values = more reliable tool usage |
| Max Tool Rounds | 2 | Enables sequential tool calls |
| Tool Mode | auto | AI proactively uses tools |

> **Tip:** Keep temperature at 0.1-0.3 for reliable tool calling. Higher values may cause hallucinated file contents.

### Pre-fetched Repository Context

When you set a repository path, the app automatically:
1. Fetches the repository structure using `get_repo_overview`
2. Injects this context into the system prompt
3. The AI knows your project layout before you ask any questions

This eliminates the need to "warm up" with a structure question - you can ask "Explain the codebase" or "What's the tech stack?" immediately and get accurate answers.

## Development

```bash
# Development server
npm run dev

# Build for production
npm run build

# Run production build
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

## Design Principles

1. **Transparency Over Magic** - Every AI action visible to users
2. **Local & Private** - All processing on user's machine
3. **Security as a Feature** - Sandboxed read-only access
4. **Errors Are Part of UX** - Actionable error messages
5. **API Design Is Product Design** - Consistent, predictable responses

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Next.js API Routes, Server-Sent Events
- **AI:** Ollama (local LLM), Model Context Protocol (MCP)
- **Testing:** Playwright (E2E)

## Documentation

- [API Reference](docs/API.md) - REST endpoint documentation
- [MCP Tools](docs/MCP.md) - Tool parameters and responses
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [LLM Tuning Journey](docs/llm-tuning-journey.md) - How we optimized LLM tool calling
- [OpenAPI Spec](docs/openapi.yaml) - OpenAPI 3.0 specification

## License

MIT

---

*Built to demonstrate modern developer tooling practices: transparent AI, local-first architecture, and Stripe-style API design.*
