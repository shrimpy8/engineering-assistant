# Claude Code Integration

This guide explains how to use the Engineering Assistant MCP server with [Claude Code](https://claude.ai/code), Anthropic's official CLI tool.

## Overview

The Engineering Assistant can run in two modes:

| Mode | LLM | Tools | Interface | Use Case |
|------|-----|-------|-----------|----------|
| **Web App** | Ollama (local) | Embedded MCP client | Next.js UI | Local-first, private exploration |
| **Claude Code** | Claude (Anthropic) | Standalone MCP server | CLI | More capable LLM, protocol demo |

When connected to Claude Code, the MCP server provides the same four tools but powered by Claude's superior reasoning capabilities.

## Prerequisites

1. **Claude Code** installed and authenticated
   ```bash
   # Install Claude Code
   npm install -g @anthropic-ai/claude-code

   # Authenticate
   claude auth
   ```

2. **MCP Server built**
   ```bash
   cd engineering-assistant/mcp-server
   npm install
   npm run build
   ```

## Configuration

### Step 1: Locate your Claude config file

Claude Code stores MCP server configurations in `~/.claude.json`.

### Step 2: Add the MCP server

Find the `mcpServers` section for your project directory and add:

```json
{
  "projects": {
    "/path/to/your/working/directory": {
      "mcpServers": {
        "engineering-assistant": {
          "type": "stdio",
          "command": "node",
          "args": [
            "/path/to/engineering-assistant/mcp-server/dist/index.js",
            "/path/to/repo/you/want/to/explore"
          ],
          "env": {}
        }
      }
    }
  }
}
```

**Important:** The repo path is passed as a command argument, not an environment variable.

### Step 3: Restart Claude Code

Exit and restart Claude Code to load the new MCP server configuration.

```bash
# Exit current session
exit

# Start new session
claude
```

### Step 4: Verify connection

Run `/mcp` in Claude Code to see all connected servers:

```
/mcp
```

You should see:
```
engineering-assistant · ✔ connected
```

## Available Tools

Once connected, Claude Code has access to these tools:

| Tool | Description |
|------|-------------|
| `get_repo_overview` | Get repository structure, file stats, and language breakdown |
| `list_files` | List files and directories with filtering options |
| `read_file` | Read file contents with size limits |
| `search_files` | Search for patterns across files using regex |

## Usage

### Explicit Tool Usage

To ensure Claude uses the MCP server tools (not its built-in file tools), be explicit in your prompts:

```
Use the engineering-assistant MCP tools to tell me about this project
```

```
Use get_repo_overview from engineering-assistant to show me the project structure
```

```
Use the engineering-assistant MCP tools to find the entry point of this project
```

### Example Questions

Once connected, try these questions:

| Question | Tools Used |
|----------|------------|
| "What is the tech stack?" | `get_repo_overview` → `read_file` (package.json/requirements.txt) |
| "Show me the project structure" | `get_repo_overview` |
| "Where is the main entry point?" | `get_repo_overview` → `read_file` |
| "Find all API routes" | `search_files` with pattern |
| "Explain the codebase" | `get_repo_overview` → `list_files` → `read_file` |

## Changing Target Repository

To explore a different repository, update the second argument in the `args` array:

```json
"args": [
  "/path/to/engineering-assistant/mcp-server/dist/index.js",
  "/path/to/different/repo"  // ← Change this
]
```

Then restart Claude Code.

## Troubleshooting

### Server shows "failed" status

1. **Check the server is built:**
   ```bash
   ls engineering-assistant/mcp-server/dist/index.js
   ```

2. **Test manually:**
   ```bash
   node /path/to/mcp-server/dist/index.js /path/to/repo
   ```

   If working, you'll see it waiting for JSON-RPC input.

3. **Verify the repo path exists:**
   ```bash
   ls /path/to/repo/you/want/to/explore
   ```

### Claude uses built-in tools instead of MCP

Be explicit in your prompt:
- ❌ "What is the tech stack?"
- ✅ "Use the engineering-assistant MCP tools to tell me the tech stack"

### Server not appearing in /mcp list

Ensure you added the config to the correct project path in `~/.claude.json`. The path should match your current working directory when running Claude Code.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Claude Code CLI                        │
│                                                              │
│  ┌────────────────┐         ┌─────────────────────────────┐ │
│  │ Claude (LLM)   │◄───────►│ MCP Protocol (JSON-RPC)     │ │
│  │ Anthropic API  │         │ stdio transport             │ │
│  └────────────────┘         └──────────────┬──────────────┘ │
│                                            │                 │
└────────────────────────────────────────────┼─────────────────┘
                                             │
                              ┌──────────────▼──────────────┐
                              │  engineering-assistant      │
                              │  MCP Server (subprocess)    │
                              │                             │
                              │  Tools:                     │
                              │  • get_repo_overview        │
                              │  • list_files               │
                              │  • read_file                │
                              │  • search_files             │
                              │                             │
                              │  Target: /path/to/repo      │
                              └─────────────────────────────┘
```

## Why Use Claude Code Integration?

1. **More Capable LLM** - Claude's reasoning is superior to local models for complex code understanding
2. **Protocol Demonstration** - Shows the MCP server working as a true subprocess with JSON-RPC communication
3. **No Local GPU Required** - Uses Anthropic's API instead of local Ollama
4. **Same Tools** - Identical tool implementations, different LLM backend

## Security Notes

- The MCP server has **read-only access** to the specified repository
- Path traversal attacks are prevented by sandbox validation
- No files outside the target repository can be accessed
- All file operations are logged

---

*See also: [MCP Tools Reference](MCP.md) | [Architecture](ARCHITECTURE.md)*
