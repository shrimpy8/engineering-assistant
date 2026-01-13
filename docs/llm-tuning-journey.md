# LLM Response Quality Tuning Journey

**Date:** January 12, 2026
**Model:** llama3.1:8b (Ollama)
**Goal:** Get consistent, accurate responses for "What is the technology stack?" questions

---

## The Problem

The engineering assistant was producing inconsistent results when users asked about technology stacks:
- Sometimes hallucinating file contents instead of reading actual files
- Outputting tool calls as JSON text instead of using native tool calling
- Only detecting JavaScript projects, failing on Python projects
- Making inferences from file names instead of reading actual dependency files

---

## Iteration Timeline

### Phase 1: Temperature Reduction

**Change:** Reduced temperature from 0.7 → 0.5 → 0.3

**Files Modified:**
- `src/types/chat.ts`
- `src/hooks/useSettings.ts`
- `src/lib/orchestrator/index.ts`

**Rationale:** Lower temperature produces more deterministic outputs, reducing hallucination and improving tool call consistency.

**Result:** Slight improvement in consistency, but core issues remained.

---

### Phase 2: Model Experimentation

**Models Tested:**

| Model | Tool Calling Support | Result |
|-------|---------------------|--------|
| `llama3.1:8b` | ✅ Native Ollama support | Works but inconsistent |
| `gpt-oss:20b` | ⚠️ Partial | Stops after first tool call, empty content |
| `qwen2.5-coder:7b` | ❌ None | Outputs JSON as text, no native tool calls |
| `mistral:7b` | ❌ None | Hallucinates results, no native tool calls |
| `llama3.2:3b` | ⚠️ Buggy | Crashes with undefined errors |

**Key Learning:** Only certain models support Ollama's native tool calling API. Most "coder" models optimize for code generation, not function calling.

**Recommendation:** Stick with `llama3.1:8b` - best balance of capability and tool support.

---

### Phase 3: Orchestrator Changes (Tool Rounds)

**Problem:** The orchestrator only allowed ONE round of tool calls, preventing patterns like:
- "Try package.json, if not found try requirements.txt"
- "Get overview first, then read specific file"

**Change:** Modified `src/lib/orchestrator/index.ts`:
```typescript
// Before
let hasExecutedTools = false;

// After
let toolRounds = 0;
const MAX_TOOL_ROUNDS = 2;
```

**Logic Updated:**
- Allow tools for up to 2 rounds
- After 2 rounds, force text-only response to prevent infinite loops

**Result:** Model could now make sequential tool calls, but still wasn't following the intended workflow.

---

### Phase 4: System Prompt Iterations

This was the most challenging phase. We went through **8+ prompt iterations** before finding what works.

#### Attempt 1: Detailed Step-by-Step Instructions
```
## For "What is the technology stack?" Questions

**YOU MUST MAKE TWO TOOL CALLS** for this question type:

**Step 1:** Call get_repo_overview to identify the project type

**Step 2 (MANDATORY - DO NOT SKIP):** Based on Step 1 results, call read_file:
- If package.json exists → call read_file("package.json")
...
```

**Result:** ❌ Model output the tool calls as JSON text instead of executing them. The explicit formatting confused the model into "explaining" rather than "doing."

#### Attempt 2: Direct File Reading
```
## For technology stack questions:
You MUST call read_file to read the actual dependency file contents:
- For JavaScript/TypeScript: read_file("package.json")
- For Python: read_file("requirements.txt")
```

**Result:** ⚠️ TypeScript worked, but Python failed because the model assumed JavaScript and tried package.json first.

#### Attempt 3: List Files First
```
## For technology stack questions:
1. First call list_files to see what dependency files exist
2. Then call read_file on the dependency file you found
```

**Result:** ❌ Model ignored the "list_files first" instruction and went straight to read_file.

#### Attempt 4: Explicit "Don't Assume" Warning
```
IMPORTANT: Projects can be JavaScript, Python, Rust, etc. Do NOT assume JavaScript.
1. FIRST call list_files to check which dependency file exists
2. THEN call read_file on the file you found
```

**Result:** ⚠️ Now assumed Python instead of JavaScript! Completely reversed the problem.

#### Attempt 5: Use get_repo_overview
```
## For technology stack questions:
Use get_repo_overview to see the project structure, then read the dependency file
```

**Result:** ⚠️ Model called get_repo_overview but didn't follow up with read_file. Made inferences from file names only.

#### Attempt 6: Two Steps Required (Explicit)
```
## For technology stack questions (TWO STEPS REQUIRED):
Step 1: Call get_repo_overview to identify the project type
Step 2: Call read_file on the dependency file to get actual dependencies

You MUST complete BOTH steps.
```

**Result:** ❌ Model output both steps as JSON text with `tool_calls: []`. The explicit step numbering triggered "explanation mode."

#### Attempt 7: Natural Language (FINAL - WORKS!)
```
You are an expert software engineering assistant. Use tools to explore codebases.

When asked about technology stack, call get_repo_overview first, then read_file on the dependency file (package.json, requirements.txt, or pyproject.toml).

When asked about what a project does, read_file README.md.

When asked about structure, use get_repo_overview.
```

**Result:** ✅ Both TypeScript and Python projects work correctly with two tool calls each!

---

## Key Learnings

### 1. LLM Tool Calling is Model-Specific

Not all models support native tool calling. Ollama's tool calling API requires models specifically trained for it:
- ✅ llama3.1 family
- ✅ llama3.2 family (with bugs)
- ❌ Most "coder" models (qwen, deepseek, codellama)

**Interview talking point:** "We discovered that tool calling support is a model capability, not just an API feature. We had to carefully select models that support Ollama's native function calling format."

### 2. Temperature Matters for Tool Calling

Lower temperature (0.1-0.3) significantly improves:
- Consistency of tool selection
- Reduction in hallucination
- Following structured workflows

**Interview talking point:** "We reduced temperature to 0.3 for more deterministic tool usage. Higher temperatures caused the model to sometimes hallucinate file contents instead of calling tools."

### 3. Prompt Format Affects Execution vs Explanation

**Critical discovery:** llama3.1:8b interprets explicit step-by-step instructions as a request to EXPLAIN the steps rather than EXECUTE them.

| Prompt Style | Model Behavior |
|--------------|----------------|
| Numbered steps with "MUST" | Outputs JSON as text, explains process |
| Natural conversational | Actually executes tool calls |
| Bullet points with conditionals | Mixed results |

**Interview talking point:** "We found that natural language prompts work better than rigid step-by-step instructions. The model interprets explicit formatting as a request to explain rather than execute."

### 4. Multi-Round Tool Calls Need Orchestrator Support

The orchestrator must:
1. Allow multiple rounds of tool calls (we use 2)
2. Inject tool results back into conversation
3. Eventually force text-only response to prevent loops

**Interview talking point:** "We modified the orchestrator to support 2 rounds of tool calls, enabling patterns like 'detect project type, then read dependency file.'"

### 5. Error Recovery is Fragile

When a tool call fails (e.g., file not found), the model often:
- Outputs the next tool call as JSON text instead of native format
- Doesn't properly retry with alternative files

**Interview talking point:** "Error recovery in LLM tool calling is still fragile. When one tool fails, models don't always gracefully retry with alternatives."

---

## Final Configuration

### System Prompt
```
You are an expert software engineering assistant. Use tools to explore codebases.

When asked about technology stack, call get_repo_overview first, then read_file on the dependency file (package.json, requirements.txt, or pyproject.toml).

When asked about what a project does, read_file README.md.

When asked about structure, use get_repo_overview.
```

### Settings
| Setting | Value | Rationale |
|---------|-------|-----------|
| Model | llama3.1:8b | Best tool calling support |
| Temperature | 0.3 | Deterministic, reduces hallucination |
| Max Tool Rounds | 2 | Allows detect → read pattern |
| Tool Mode | auto | Proactive tool usage |

---

## Test Results (Final)

| Project Type | Tools Called | Dependencies Found | Status |
|--------------|--------------|-------------------|--------|
| TypeScript (movie-discovery) | `get_repo_overview` → `read_file(package.json)` | React, Redux Toolkit, Tailwind CSS, Vite | ✅ |
| Python (research-copilot) | `get_repo_overview` → `read_file(pyproject.toml)` | Streamlit, httpx, Pydantic | ✅ |

---

## Interview Discussion Points

1. **Model Selection:** "We evaluated 5 different models and found only llama3.1 properly supports Ollama's native tool calling."

2. **Prompt Engineering:** "We went through 8 prompt iterations. The key insight was that natural language works better than explicit step-by-step instructions for tool execution."

3. **Architecture Decisions:** "We designed a 2-round tool call system to support common patterns like 'detect then read' while preventing infinite loops."

4. **Temperature Tuning:** "Lower temperature (0.3) was critical for consistent tool usage and reducing hallucination."

5. **Transparency:** "Every tool call is visible in the UI's Tool Trace panel, so users always know what files the AI accessed."

---

## Phase 5: Extending to Q3, Q4, Q5 (January 12, 2026 - Evening)

After the initial success with Q6 (technology stack), we identified that Q3, Q4, and Q5 were underperforming:

### Problem Analysis

| Question | Original Behavior | Issue |
|----------|------------------|-------|
| Q3 (Dependencies) | `read_file` only | Guessed file names without checking what exists |
| Q4 (Entry Point) | `read_file` only | Read README instead of finding actual entry files |
| Q5 (How it works) | `read_file` only | Shallow - only README, no code exploration |

### Iteration 1: Verbose Prompt (FAILED)

Extended the prompt with detailed guidance for each question type:

```
When asked about dependencies, first use get_repo_overview to identify the project type
from file extensions and directory structure, then read the actual dependency file you
discover. Different projects use different files - look for what actually exists rather
than assuming.

When asked about the main entry point, use get_repo_overview to understand the project
structure, then look at config files or the source directory to identify where execution
begins. Entry points vary by framework - a web app might start from an index file, a CLI
from a main script, a library from its exports.

When asked how an application works, combine high-level understanding from the README
with exploration of key implementation files. After reading the README, use
get_repo_overview to find the main source directory, then read the entry point or core
modules to explain the actual implementation.
```

**Result:** ❌ Q5 regressed badly - 4/9 projects got NO tool calls. The LLM outputted responses like:
- "To answer the question, I will first use `get_repo_overview`..." (explaining, not doing)
- `{"name": "get_repo_overview", "para...` (JSON as text)

**Learning:** Even without numbered steps, overly verbose guidance can trigger "explanation mode."

### Iteration 2: Concise Natural Language (SUCCESS!)

Simplified to match the working Q6 pattern - short, direct sentences:

```
You are an expert software engineering assistant. You explore codebases using tools.

Always discover before assuming - use get_repo_overview to understand what files exist
before trying to read specific files.

When asked what a project is about, read the README.

When asked about structure, use get_repo_overview.

When asked about dependencies, use get_repo_overview to see the project type, then read
the dependency file that exists (package.json for Node, requirements.txt for Python, etc).

When asked about entry points, use get_repo_overview to see structure, then read config
or source files to find where execution starts.

When asked how something works, read the README first, then explore key source files to
understand the implementation.

When asked about technology stack, call get_repo_overview first, then read_file on the
dependency file.
```

**Result:** ✅ 100% tool usage restored, proper multi-tool chains for all questions!

### Test Results Comparison

| Metric | Run 1 (Original) | Run 2 (Verbose) | Run 3 (Concise) |
|--------|------------------|-----------------|-----------------|
| Tool Usage | 100% | 92.6% | **100%** |
| Q3 Tools | `read_file` | `get_repo_overview`+read | `get_repo_overview`+`read_file` |
| Q4 Tools | `read_file` | `get_repo_overview` | `get_repo_overview`+`list_files`+`read_file` |
| Q5 Tools | `read_file` | 5/9 only (4 NONE!) | 9/9 (`read_file`+`get_repo_overview`) |
| Q6 Tools | 2 tools | 1 tool | 2 tools |

### Key Learning: Prompt Length and Verbosity

The critical insight from this phase:

| Prompt Style | Result |
|--------------|--------|
| Too short (original) | Works but limited - no guidance for Q3, Q4, Q5 |
| Too verbose (Run 2) | Triggers explanation mode even without numbered steps |
| **Concise natural language (Run 3)** | **Best results - discovery-first behavior + execution** |

**The sweet spot:** One clear, simple sentence per question type. No elaboration, no examples within the prompt, no conditional logic spelled out.

### Updated Interview Talking Points

6. **Prompt Length Matters:** "We found that prompt verbosity affects execution. Too verbose and the model explains instead of executes. We keep guidance to one clear sentence per question type."

7. **Discovery-First Pattern:** "We teach the model to discover before assuming. For any question about a codebase, it first uses get_repo_overview to understand what files exist, then reads the appropriate files based on what it finds."

8. **Iterative Testing:** "We ran 54 tests per iteration (9 projects × 6 questions) to validate changes. This caught regressions immediately - our verbose prompt caused 4/9 Q5 responses to fail."

---

## Final System Prompt (Updated January 12, 2026)

```
You are an expert software engineering assistant. You explore codebases using tools.

Always discover before assuming - use get_repo_overview to understand what files exist
before trying to read specific files.

When asked what a project is about, read the README.

When asked about structure, use get_repo_overview.

When asked about dependencies, use get_repo_overview to see the project type, then read
the dependency file that exists (package.json for Node, requirements.txt for Python, etc).

When asked about entry points, use get_repo_overview to see structure, then read config
or source files to find where execution starts.

When asked to explain the codebase, use get_repo_overview to see the structure, list_files
to find source files, and read_file on key implementation files to explain the code architecture.

When asked about technology stack, call get_repo_overview first, then read_file on the
dependency file.
```

---

## Test Coverage

| Question | Expected Tool Pattern | Actual (Run 4) | Status |
|----------|----------------------|----------------|--------|
| Q1 (What is this about?) | `read_file(README)` | `read_file` 9/9 | ✅ |
| Q2 (Project structure) | `get_repo_overview` | `get_repo_overview` 9/9 | ✅ |
| Q3 (Dependencies) | `get_repo_overview` → `read_file` | Multi-tool 9/9 | ✅ |
| Q4 (Entry point) | `get_repo_overview` → explore | Multi-tool 9/9 | ✅ |
| Q5 (Explain codebase) | `get_repo_overview` → `list_files` → `read_file` | 3-5 tools 9/9 | ✅ |
| Q6 (Tech stack) | `get_repo_overview` → `read_file` | Multi-tool 9/9 | ✅ |

---

## Phase 6: Q5 Question Optimization (January 12, 2026 - Evening)

### Problem
Q5 "How does this application work?" was too similar to Q1 "What is this project about?" - both resulted in reading README.md. Q5 wasn't triggering deep code exploration.

### Solution
Changed Q5 from "How does this application work?" to "Explain the codebase" with updated system prompt guidance:

```
When asked to explain the codebase, use get_repo_overview to see the structure, list_files to find source files, and read_file on key implementation files to explain the code architecture.
```

### Results (Run 4)
Q5 now consistently uses 3-5 tools for deep code exploration:
- ollama-chat-interface: 5 tools (`get_repo_overview|list_files|read_file|read_file|read_file`)
- ytpodcast-transcript2: 4 tools (`get_repo_overview|list_files|read_file|read_file`)
- All other projects: 3 tools minimum

### Key Learning
**Question phrasing matters as much as prompt engineering.** "Explain the codebase" signals "show me the code structure and implementation" while "How does this application work?" signals "give me an overview" (which overlaps with Q1).

---

## Phase 7: Pre-fetch Repository Context (January 13, 2026)

### Problem
Users had to ask about structure first before other questions would work correctly. Asking "Explain the codebase" as the first question would sometimes fail because the model didn't know the project layout yet.

The model would:
- Output tool calls as JSON text instead of using native tool calling
- Guess file paths instead of discovering what exists
- Need a "warm-up" structure question to work properly

### Solution: Context Pre-loading
Modified the orchestrator to automatically fetch `get_repo_overview` when initializing, then inject it into the system prompt.

**Files Modified:**
- `src/lib/orchestrator/promptBuilder.ts` - Added `repoOverview` option and `setRepoOverview()` method
- `src/lib/orchestrator/index.ts` - Added `prefetchRepoOverview()` in `initialize()`

**Implementation:**
```typescript
// In Orchestrator.initialize()
private async prefetchRepoOverview(): Promise<void> {
  if (!this.mcpClient) return;

  const result = await this.mcpClient.callTool('get_repo_overview', {
    max_depth: 3,
    include_stats: true,
  });

  const overview = JSON.stringify(result, null, 2);
  this.promptBuilder.setRepoOverview(overview);
}
```

**System Prompt Addition:**
```
## Repository Structure (Pre-loaded)

Here is the repository structure you already know about. Use this to inform
your tool calls - you don't need to call get_repo_overview again unless the
user specifically asks for structure.

[JSON overview data]
```

### Results
| Metric | Before | After |
|--------|--------|-------|
| First question success | ~60% | **100%** |
| Prompt tokens | ~1400 | ~3500 (includes overview) |
| Need warm-up question | Yes | **No** |
| Tool call reliability | Inconsistent | **Consistent** |

### Key Learning
**Pre-loading context is better than relying on the model to discover it.** By injecting the repository structure into the system prompt, the model:
- Makes informed decisions about which files to read
- Doesn't waste a tool round on `get_repo_overview`
- Can answer complex questions correctly on the first try

### Interview Talking Points

9. **Context Pre-loading:** "We pre-fetch the repository structure when the user sets a repo path and inject it into the system prompt. This eliminates the 'cold start' problem where the model needs to discover the project layout before answering questions."

10. **Trade-off Analysis:** "Pre-loading adds ~2000 tokens to every prompt, but the reliability improvement is worth it. Users can now ask any question first and get accurate answers."

---

*Document created: January 12, 2026*
*Updated: January 13, 2026 (Phase 7 - Pre-fetch repository context)*
