# CLAUDE.md
## Engineering Assistant — Project Principles

> **One-liner:** A local-first AI assistant that helps developers understand codebases through transparent, secure, and well-designed tooling.
>
> **Scope:** project-specific principles, invariants, and gotchas only. General engineering, security, language, and testing standards are handled globally and are not restated here.

---

## 🎯 Project Purpose

**We're building this to demonstrate:**
1. Modern API design sensibility (Stripe-style)
2. Developer experience intuition (transparent tool execution)
3. Security-first thinking (sandboxed file access)
4. Protocol standardization over proprietary solutions (MCP)

**Target audience for the demo:** Developer tooling PM roles, API platform PM roles

---

## 🧭 Core Principles

### 1. Transparency Over Magic

Users must always know what the AI is doing with their code.

- ✅ Show every file read in the Tool Trace panel
- ✅ Display search patterns and results
- ✅ Summarize tool outputs in the assistant response (not only the Tool Trace)
- ✅ Make errors visible with clear explanations
- ❌ Never silently access files
- ❌ Never hide tool failures

**Test yourself:** "Can the user explain exactly what happened in this interaction?"

---

### 2. Local & Private by Default

All processing happens on the user's machine.

- ✅ Ollama for inference (no cloud LLM calls)
- ✅ MCP server runs locally
- ✅ No telemetry, no external data transmission
- ❌ No "phone home" features
- ❌ No cloud dependencies for core functionality

Note: External reference links are for contributors only; the app runs without internet at runtime.

**Test yourself:** "Does this work with WiFi turned off?"

---

### 3. Security as a Feature, Not a Constraint

Sandboxing isn't a limitation—it's the product.

- ✅ All paths validated against repo root
- ✅ If `ALLOWED_REPO_ROOT` is set, repos must be inside it
- ✅ Multi-layer path traversal protection
- ✅ Read-only access in v1 (no write/delete)
- ✅ Symlink escape prevention
- ❌ Never trust user input without validation
- ❌ Never expose paths outside the sandbox

**Test yourself:** "What's the worst thing a malicious input could do here?"

---

### 4. Errors Are Part of the UX

When things go wrong, help the user fix it.

- ✅ Every error has: code, message, suggestion
- ✅ Actionable recovery steps (not just "Something went wrong")
- ✅ Technical details available but not prominent
- ❌ No stack traces shown to users
- ❌ No generic "Error occurred" messages

**Test yourself:** "If I saw this error, would I know what to do next?"

---

### 5. API Design Is Product Design

Our API endpoints should feel inevitable.

- ✅ Consistent response shapes (`success`, `data`, `meta`)
- ✅ Request IDs in every response
- ✅ Predictable error codes
- ✅ Self-documenting (names explain purpose)
- ❌ No inconsistent field naming
- ❌ No endpoint that requires reading code to understand

**Test yourself:** "Could a developer guess this endpoint's behavior from its name?"

---

### 6. Minimal, Not Incomplete

The UI should feel finished, just focused.

- ✅ Every element serves a purpose
- ✅ Consistent spacing, typography, colors
- ✅ Smooth transitions and loading states
- ✅ Works on mobile (responsive down to 768px)
- ❌ No placeholder text in production
- ❌ No "coming soon" features visible

**Test yourself:** "Would I be embarrassed showing this to an Apple design reviewer?"

---

## 🚦 Decision Framework

When making implementation choices, ask in this order:

```
1. Does it compromise security?
   → If yes, don't do it.

2. Does it break transparency?
   → If yes, find another way.

3. Does it add complexity without clear user value?
   → If yes, defer to v1.1.

4. Is there a simpler solution that's 80% as good?
   → If yes, do that first.

5. Does it follow our established patterns?
   → If no, document why you're diverging.
```

---

## 🛡️ Code Quality Guardrails (Lessons from Audits)

These rules close specific gaps found during the code quality audits (see `docs/ISSUE_FIXES.md`).

### Module-level import naming — avoid constructor parameter shadows
`src/lib/config/index.ts` exports `const config = loadConfig()`. Classes that accept a `config` constructor parameter **must not** name the module-level import `config` — the parameter silently shadows it inside the constructor body. Use `appConfig` for the module-level import (`import { config as appConfig } from '@/lib/config'`) so both names are unambiguous.

### Information disclosure — never return `error.message` to clients
In `mcp-server/src/server.ts` (and any API route), unexpected errors must return a static `'Internal server error'` string — never `error.message`, `err.message`, or `String(error)`. Those leak file paths, DB errors, and stack traces. Log the full error server-side with `logger.error({ err }, '...')`.

### `mcp-server/src/shared/` has been deleted (as of PR #3, 2026-05-13)
The Tool Parity Checklist below is now obsolete — the shared directory was removed and tools exist only in `src/lib/tools/`. Do not recreate `mcp-server/src/shared/`.

---

## 📐 Technical Guardrails

### API Responses
```typescript
// ALWAYS this shape for success
{ success: true, data: {...}, meta: { request_id, timestamp, duration_ms } }

// ALWAYS this shape for errors
{ success: false, error: { code, message, type, param?, details? }, meta: {...} }
```

### Error Codes
- Use lowercase_snake_case: `file_not_found`, `access_denied`
- Be specific: `ollama_unavailable` not `service_error`
- Include the "what": `repo_path_not_found` not `not_found`

### File/Function Naming
| Type | Convention | Example |
|------|------------|---------|
| Files | kebab-case for non-components; PascalCase for React components | `tool-trace-panel.tsx`, `ToolTracePanel.tsx` |
| Components | PascalCase | `ToolTracePanel` |
| Functions | camelCase | `validatePath` |
| Constants | SCREAMING_SNAKE | `MAX_FILE_SIZE` |

### Component Rules
- One component per file
- Props interface defined at top
- No inline styles (use Tailwind tokens)
- Loading and error states handled

### Repo Path UX
- Support a native folder picker and manual entry.
- Invalid paths show inline errors and prompt the user to fix settings.

---

## 🎨 Design Tokens (Quick Reference)

```
Colors (Light):
  Background:   #FFFFFF / #F7F7F7 / #EBEBEB
  Text:         #1A1A1A / #6B6B6B / #999999
  Accent:       #0066CC
  Error:        #D93025
  Success:      #188038

Spacing (4px base):
  Tight:   4px, 8px
  Normal:  12px, 16px
  Loose:   24px, 32px

Typography:
  Body:    16px, 400 weight
  Small:   14px, 400 weight
  Heading: 20px, 600 weight
  Mono:    SF Mono / Fira Code
```

---

## ✅ Definition of Done

A feature is complete when:

- [ ] It works as specified
- [ ] Error states are handled with user-friendly messages
- [ ] Loading states are implemented
- [ ] It's tested (unit + integration where applicable)
- [ ] It follows the naming conventions
- [ ] It doesn't break existing functionality
- [ ] It looks right on desktop and tablet (768px+)
- [ ] Console has no errors or warnings
- [ ] A PM could demo it without explanation

---

## 🔴 MANDATORY: PRD Verification Protocol (NEVER SKIP)

**This section exists because critical components were skipped in the past. This protocol is NON-NEGOTIABLE.**

### After EVERY Milestone Completion

Before marking ANY milestone as complete in PROGRESS.md, you MUST:

#### Step 1: Directory Structure Verification
```bash
# Compare PRD Section 5.2 directory structure against actual filesystem
# Every file listed in PRD MUST exist
```

**Verify these critical paths exist:**
- [ ] `src/lib/mcp/client.ts` - MCP client implementation
- [ ] `src/lib/mcp/protocol.ts` - JSON-RPC helpers
- [ ] `src/lib/mcp/types.ts` - MCP type definitions
- [ ] `src/lib/orchestrator/index.ts` - Main orchestration logic
- [ ] `src/lib/orchestrator/toolRouter.ts` - Tool call detection & routing
- [ ] `src/lib/orchestrator/promptBuilder.ts` - System prompt construction

#### Step 2: Task-by-Task PRD Cross-Reference
For each milestone task in the PRD:
1. Read the PRD task description
2. Find the corresponding implementation file(s)
3. Verify the implementation matches the PRD specification
4. Document in PROGRESS.md with file paths and line numbers

**Example PROGRESS.md entry (REQUIRED FORMAT):**
```markdown
### Task 3.6: Build orchestrator for chat flow
- **Status:** COMPLETE
- **PRD Reference:** Section 5.4, Lines 516-523
- **Implementation Files:**
  - `src/lib/orchestrator/index.ts` (Lines 1-150) - Main orchestration logic
  - `src/lib/orchestrator/toolRouter.ts` (Lines 1-89) - Tool routing
- **Verification:** Tool lifecycle events (started → completed/error) implemented
- **Test Coverage:** `__tests__/integration/orchestrator.test.ts` (15 tests)
```

#### Step 3: API Contract Verification
For each API endpoint, verify:
- [ ] HTTP method matches PRD (GET/POST/etc.)
- [ ] URL path matches PRD exactly
- [ ] Request body schema matches PRD
- [ ] Response body schema matches PRD
- [ ] SSE event format matches PRD (if streaming)
- [ ] Error codes match PRD Section 8

#### Step 4: Integration Verification
- [ ] Chat endpoint actually calls MCP tools (not just Ollama directly)
- [ ] Tool trace events are emitted during chat
- [ ] MCP client connects to MCP server
- [ ] End-to-end flow works: User message → Orchestrator → MCP → Tool execution → Response

#### Step 5: Sign-Off Checklist
Before writing "COMPLETE" in PROGRESS.md:

```markdown
## Milestone X Sign-Off

I have verified:
- [ ] Every file in PRD Section 5.2 exists for this milestone
- [ ] Every task in PRD Milestone X is implemented (not skipped)
- [ ] API contracts match PRD exactly (method, path, schema)
- [ ] Integration between components is functional (not just individual pieces)
- [ ] I ran the validation tests specified in the PRD for this milestone
- [ ] I can demonstrate the feature working end-to-end

Files created/modified:
- [list every file with line counts]

Deviations from PRD (MUST BE DOCUMENTED):
- [list any deviations with justification, or "None"]
```

### Tool Parity Checklist ~~(TEMPORARY UNTIL TD-001)~~ — RESOLVED
`mcp-server/src/shared/` was deleted in PR #3 (2026-05-13). Tools now live exclusively in `src/lib/tools/`. There is no second location to keep in sync. If you add a new tool, add it only to `src/lib/tools/` and update `docs/MCP.md`.

### What "COMPLETE" Actually Means

**COMPLETE ≠ "I wrote some code"**
**COMPLETE = "The PRD specification is fully implemented and verified"**

A milestone is ONLY complete when:
1. ALL tasks in the PRD milestone are done
2. ALL files specified in PRD exist
3. ALL integrations between components work
4. ALL validation tests pass
5. The sign-off checklist is filled out in PROGRESS.md

### Red Flags That Indicate Incomplete Work

If you observe any of these, the milestone is NOT complete:
- ❌ "Talks directly to Ollama" without orchestrator
- ❌ Files listed in PRD Section 5.2 don't exist
- ❌ API endpoint uses different HTTP method than PRD
- ❌ SSE events use different format than PRD Section 6.4.1.1
- ❌ MCP client doesn't exist but MCP server does
- ❌ Tool trace shows no events during chat
- ❌ Components exist but aren't connected to each other

---

## 🚫 Explicit Non-Goals (v1)

To maintain focus, we are **not** building:

- File writing/editing capabilities
- Git operations (commit, branch, push)
- Multi-repository support
- User authentication
- Conversation persistence across sessions
- Syntax highlighting in responses
- Code execution
- Cloud deployment

These are valid features for v1.1+ but would delay our MVP.

---

## 💬 How to Talk About This Project

### The Elevator Pitch
"It's a local AI assistant that helps developers understand unfamiliar codebases. What makes it different is full transparency—you see every file it reads—and it uses a standardized protocol instead of proprietary tool schemas."

### Interview Emphasis (General)
- Emphasize: Sandboxing, tool transparency, pipeline-friendly architecture
- Emphasize: Stripe-style API design, error handling, developer experience
- Key phrase: "Developers need to see exactly what happened"

---

## 📁 Key Files to Know

| Purpose | Location |
|---------|----------|
| API routes | `src/app/api/v1/` |
| Chat orchestration | `src/lib/orchestrator/` |
| MCP client | `src/lib/mcp/client.ts` |
| Error definitions | `src/lib/errors/` |
| UI components | `src/components/` |
| MCP server tools | `mcp-server/src/tools/` |
| Config loader | `src/lib/config/index.ts` |
| System prompt | `config/prompts/system-prompt.txt` |
| Demo flow | `docs/demo-flow.md` |
| **LLM Tuning Guide** | `docs/llm-tuning-journey.md` |
| **Progress tracker** | `PROGRESS.md` |
| **PRD** | `docs/engineering-assistant-prd-v1.4.md` |

---

## 🚀 Next Feature: Configurable MCP Mode

**PRD:** [`docs/PRD-Configurable-MCP-Mode.md`](docs/PRD-Configurable-MCP-Mode.md)

Add ability to switch between two MCP execution modes via `MCP_MODE` env var:

| Mode | Description | Use Case |
|------|-------------|----------|
| `embedded` | Direct function calls (default) | Fast local development |
| `server` | Spawn MCP server subprocess | Protocol debugging, demo |

**Why this matters for interviews:**
- Demonstrates MCP is a real protocol (JSON-RPC 2.0), not just internal calls
- Shows Strategy pattern with clean interface abstraction
- Production mindset: subprocess isolation, graceful shutdown

**Key milestones:**
1. Interface Extraction (`IMCPClient`)
2. Embedded Client Refactor
3. Server Client Implementation
4. Configuration & Factory
5. Testing & Verification
6. Documentation & Demo

See full PRD for detailed tasks and acceptance criteria.

---

## 🤖 LLM Configuration Guidelines

### Model Selection
Only `llama3.1:8b` reliably supports Ollama's native tool calling. Other models either:
- Output tool calls as JSON text (qwen, deepseek-coder)
- Hallucinate results instead of calling tools (mistral)
- Crash or return empty responses (llama3.2:3b edge cases)

### Temperature
**Use 0.3 or lower** for tool-calling scenarios. Higher temperatures cause:
- Inconsistent tool selection
- Hallucinated file contents
- Model "explaining" tool calls instead of executing them

### System Prompt Style
**Natural language works better than explicit steps.** llama3.1:8b interprets numbered step-by-step instructions as a request to EXPLAIN rather than EXECUTE.

```
# BAD - Model explains instead of executing
Step 1: Call get_repo_overview
Step 2: Call read_file on package.json

# GOOD - Model actually executes
When asked about technology stack, call get_repo_overview first, then read_file on the dependency file.
```

### Multi-Round Tool Calls
The orchestrator allows 2 tool rounds (`MAX_TOOL_ROUNDS`). This enables patterns like:
1. `get_repo_overview` → detect project type
2. `read_file` → read the appropriate dependency file

See `docs/llm-tuning-journey.md` for the full iteration history and interview talking points.

---

## 📝 Documentation Standards

All code must be documented to a level that supports:
1. **Onboarding** - New developers understand purpose within 5 minutes
2. **API Discovery** - External consumers can integrate without reading source
3. **Maintenance** - Future you remembers why decisions were made

### Inline Documentation

```typescript
/**
 * Validates a file path against the sandbox root.
 *
 * @param path - Absolute path to validate
 * @param repoRoot - Repository root to sandbox within
 * @returns Normalized, safe absolute path
 * @throws {PathValidationError} If path escapes sandbox
 *
 * @example
 * const safePath = validatePath('/repo/src/index.ts', '/repo');
 */
```

### Required Documentation Files (Milestone 5)

| File | Purpose |
|------|---------|
| `README.md` | Quickstart, installation, basic usage |
| `API.md` | All endpoints with request/response examples |
| `MCP.md` | All MCP tools with parameters and examples |
| `ARCHITECTURE.md` | System diagram, data flow, component relationships |
| `openapi.yaml` | OpenAPI 3.0 spec for all REST endpoints |
| `docs/examples/` | Working code samples (curl, JavaScript, Python) |

### Documentation Test

"Can someone use this API endpoint without reading the source code?"

---

## 🔄 Daily Standup Questions

1. What did I ship yesterday?
2. What's blocking me?
3. Am I following the principles above?
4. Is there something I should simplify?

---

## 📚 Reference Links

- [MCP Specification](https://modelcontextprotocol.io)
- [Ollama API Docs](https://github.com/ollama/ollama/blob/main/docs/api.md)
- [Stripe API Design](https://stripe.com/docs/api)
- [Next.js App Router](https://nextjs.org/docs/app)

---

## Security Patterns Learned (2026-06-03)

These rules close gaps found in the 2026-06-03 high-priority audit (see `docs/HIGH_PRIORITY_REVIEW_2026-06-03.md`).

### Repo root must always be bounded (EA-01)
`ALLOWED_REPO_ROOT` must default to `process.cwd()` — never leave it `undefined`. When the env var is absent, any absolute path becomes valid, letting any caller browse the host filesystem. Default to the process working directory; if wider access is needed, require an explicit `ALLOWED_REPO_ROOTS` allowlist. Apply this at the `loadConfig()` level so the safe default propagates everywhere automatically.

### Repository content never enters the system prompt (EA-02)
Repo overviews, file contents, and tool results are untrusted external data. They belong in **user-role messages wrapped in XML data tags** (`<repository_overview>`, `<tool_result tool="...">...</tool_result>`), never in the system prompt. The system prompt must explicitly state that those tagged blocks are untrusted data and must never change instructions. Placing external content in the system prompt gives it elevated authority and is a prompt-injection vector.

### XML closing tags must be escaped before wrapping content (EA-02 follow-up)
Before placing any external content inside an XML-delimited block, replace `</` with `&lt;/` throughout the content string. A file containing `</tool_result>` can break the intended boundary and cause subsequent text to be interpreted as model structure rather than data. Apply the escape in a single shared helper (e.g. `escapeXmlClosingTags()`) called at every wrap site.

### Regex patterns from callers must be validated before use (EA-03)
Before calling `new RegExp(pattern)` on a model- or user-supplied pattern: (1) cap length at 200 characters, (2) reject patterns containing nested quantifiers that cause catastrophic backtracking (e.g. `(a+)+`, `(a*)*`), and (3) wrap the constructor in a `try/catch`. Return a controlled error before any file scanning begins. A heuristic guard is acceptable until a linear-time engine is available; document the limitation.

### Symlink escape prevention requires async realpath (EA-06)
Lexical `path.join()` + `startsWith()` checks do not catch symlinks pointing outside the sandbox. After the lexical check, call `await fs.realpath(resolvedPath)` and verify the resolved real path still starts with the repo root. Apply this to every file read, list, and write handler — not just the MCP path validator. `ENOENT` from `realpath` should fall through to the existing 404 path.

### Message role filtering at the API boundary (EA-05)
The chat endpoint must filter client-supplied messages to `user` and `assistant` roles only before passing them to the orchestrator. Reject the request with HTTP 400 if no allowed messages remain after filtering. Never forward `system` or `tool` messages from external callers — they can inject instructions or forge tool outputs, undermining the server-controlled prompt hierarchy.
