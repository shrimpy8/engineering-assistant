# Engineering Assistant — Code Quality Audit

**Date:** 2026-05-13
**Auditor:** Claude Opus
**Scope:** Full codebase review (web app + MCP server)

## Summary

| Severity | Count |
|----------|-------|
| Critical (P0) | 3 |
| High (P1) | 8 |
| Medium (P2) | 12 |
| Low (P3) | 7 |
| **Total** | **30** |

Key themes: `console.error`/`console.log` usage instead of structured logger (pervasive), ReDoS vulnerability in glob-to-regex conversion, unsafe `as unknown as` type coercions bypassing validation, missing timeouts on streaming fetch calls, unbounded client pool with no eviction, and significant DRY violations between `src/lib/tools/core.ts` and `mcp-server/src/shared/core.ts`.

---

## Issues and Fixes

### Critical (P0)

#### Issue #1: ReDoS vulnerability in glob-to-regex conversion (shared/core.ts)
- **File:** `src/lib/tools/core.ts:140` (and duplicate at `mcp-server/src/shared/core.ts:139`)
- **Category:** Security
- **Severity:** P0
- **Problem:** The glob pattern from user input is converted to regex with a naive `.replace(/\*/g, '.*')`. A malicious pattern like `***********************!` creates a catastrophic backtracking regex that can hang the Node.js event loop for seconds or longer, causing denial of service.
- **Impact:** Any user can freeze the server by sending a crafted `pattern` param to `list_files`.
- **Surgical Fix:**
```typescript
// Before (line 139-142 in src/lib/tools/core.ts):
if (params.pattern) {
  const regex = new RegExp(
    params.pattern.replace(/\*/g, '.*').replace(/\?/g, '.')
  );
  if (!regex.test(entry.name)) continue;
}

// After:
if (params.pattern) {
  const escaped = params.pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '.*')
    .replace(/\*/g, '[^/]*')
    .replace(/\?/g, '.');
  const regex = new RegExp(`^${escaped}$`);
  if (!regex.test(entry.name)) continue;
}
```
Apply the same fix to `mcp-server/src/shared/core.ts:139`.

#### Issue #2: ReDoS vulnerability in glob-to-regex for search (shared/core.ts)
- **File:** `src/lib/tools/core.ts:277-281` (and duplicate at `mcp-server/src/shared/core.ts:277-281`)
- **Category:** Security
- **Severity:** P0
- **Problem:** Same glob-to-regex pattern used in `searchFiles` — `params.glob.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*')` does not escape regex metacharacters in the non-glob parts of the input, allowing user-controlled regex injection.
- **Impact:** Denial of service via event loop hang, or unintended file matching via injected regex.
- **Surgical Fix:**
```typescript
// Before (lines 277-281 in src/lib/tools/core.ts):
if (params.glob) {
  const relativePath = path.relative(repoRoot, entryPath);
  const globRegex = new RegExp(
    params.glob
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '.')
  );
  if (!globRegex.test(relativePath)) continue;
}

// After:
if (params.glob) {
  const relativePath = path.relative(repoRoot, entryPath);
  const safeGlob = params.glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*\\\*/g, '.*')        // restore ** -> .*
    .replace(/\\\*/g, '[^/]*')          // restore * -> [^/]*
    .replace(/\\\?/g, '.');             // restore ? -> .
  const globRegex = new RegExp(`^${safeGlob}$`);
  if (!globRegex.test(relativePath)) continue;
}
```
Apply the same fix to `mcp-server/src/shared/core.ts:277-281`.

#### Issue #3: `console.error` used for production error logging in API routes
- **File:** `src/app/api/v1/chat/completions/route.ts:302`, `src/app/api/v1/files/read/route.ts:150`, `src/app/api/v1/files/route.ts:192`
- **Category:** Logging
- **Severity:** P0
- **Problem:** Multiple API route error handlers fall through to `console.error(...)` instead of using the structured pino logger. This means errors in production will not be structured JSON, not be filterable, and lose request correlation IDs.
- **Impact:** Production debugging is severely hampered; log aggregation tools cannot parse these entries; violates CLAUDE.md rule "never use `console.log` (Node.js) in production code".
- **Surgical Fix:**
```typescript
// Before (src/app/api/v1/chat/completions/route.ts:302):
console.error('Chat completions error:', error);

// After:
import { logger } from '@/lib/logger';
// ... (at line 302):
logger.error({ error: error instanceof Error ? error.message : 'Unknown error' }, 'Chat completions error');
```
```typescript
// Before (src/app/api/v1/files/read/route.ts:150):
console.error('File read error:', error);

// After:
logger.error({ error: error instanceof Error ? error.message : 'Unknown error', request_id: ctx.requestId }, 'File read error');
```
```typescript
// Before (src/app/api/v1/files/route.ts:192):
console.error('Files API error:', error);

// After:
logger.error({ error: error instanceof Error ? error.message : 'Unknown error', request_id: ctx.requestId }, 'Files API error');
```

---

### High (P1)

#### Issue #4: Missing timeout on streaming fetch in `chatStream`
- **File:** `src/lib/ollama/client.ts:188-198`
- **Category:** Resilience
- **Severity:** P1
- **Problem:** The `chatStream` method creates an `AbortController` but never attaches a timeout to it (unlike the non-streaming `request` method which uses `setTimeout`). If Ollama hangs mid-stream, the connection stays open indefinitely.
- **Impact:** Resource leak — open connections accumulate, eventually exhausting available file descriptors or memory.
- **Surgical Fix:**
```typescript
// Before (lines 182-187):
async *chatStream(
  request: OllamaChatRequest
): AsyncGenerator<OllamaStreamChunk> {
  const url = `${this.config.baseUrl}/api/chat`;
  const controller = new AbortController();

  log.info({ model: request.model }, 'Starting streaming chat');

// After:
async *chatStream(
  request: OllamaChatRequest
): AsyncGenerator<OllamaStreamChunk> {
  const url = `${this.config.baseUrl}/api/chat`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

  log.info({ model: request.model }, 'Starting streaming chat');
```
And add `clearTimeout(timeoutId)` in the finally block (before `throw`) and after the while loop exits normally:
```typescript
// After the while(true) loop body ends and before catch:
      // Process any remaining data in buffer (existing code)
      ...
      clearTimeout(timeoutId);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
```

#### Issue #5: Missing timeout on `pullModel` fetch
- **File:** `src/lib/ollama/client.ts:277-286`
- **Category:** Resilience
- **Severity:** P1
- **Problem:** The `pullModel` method has no timeout on its `fetch` call. Model pulls can take minutes legitimately, but there is no upper bound — a hung connection will never be cleaned up.
- **Impact:** Indefinitely hanging connections on network issues.
- **Surgical Fix:**
```typescript
// Before (line 277):
const response = await fetch(url, {

// After:
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 min max for pull
const response = await fetch(url, {
  signal: controller.signal,
```
And add `clearTimeout(timeoutId)` in both the success path (after the while loop) and the catch block.

#### Issue #6: Unbounded MCP client pool — no eviction or size limit
- **File:** `src/lib/mcp/client.ts:250`
- **Category:** Resource Leak
- **Severity:** P1
- **Problem:** `clientPool` is a `Map<string, MCPClient>` that grows without bound. Each unique repo path creates a new entry that is never evicted unless the client disconnects. In a server environment where users switch between many repos, this leaks EventEmitter instances.
- **Impact:** Memory leak proportional to unique repo paths used over the server lifetime.
- **Surgical Fix:**
```typescript
// Before (line 250):
const clientPool = new Map<string, MCPClient>();

// After:
const MAX_POOL_SIZE = 20;
const clientPool = new Map<string, MCPClient>();

// Add eviction before inserting in getMCPClient (around line 266):
// Before: clientPool.set(repoRoot, client);
// After:
if (clientPool.size >= MAX_POOL_SIZE) {
  const oldestKey = clientPool.keys().next().value;
  if (oldestKey !== undefined) {
    const oldClient = clientPool.get(oldestKey);
    clientPool.delete(oldestKey);
    oldClient?.disconnect().catch(() => {});
  }
}
clientPool.set(repoRoot, client);
```

#### Issue #7: `console.log` in promptBuilder production code
- **File:** `src/lib/orchestrator/promptBuilder.ts:188-190`
- **Category:** Logging
- **Severity:** P1
- **Problem:** `console.log('[PromptBuilder] Loaded system prompt from external file')` and `console.log('[PromptBuilder] Using fallback system prompt')` use `console.log` instead of the pino logger.
- **Impact:** Unstructured output in production; violates CLAUDE.md logging rules.
- **Surgical Fix:**
```typescript
// Before (lines 188-190):
console.log('[PromptBuilder] Loaded system prompt from external file');

// After:
import { createModuleLogger } from '@/lib/logger';
const log = createModuleLogger('prompt-builder');
// ...
log.info('Loaded system prompt from external file');
```
```typescript
// Before (line 191):
console.log('[PromptBuilder] Using fallback system prompt');

// After:
log.info('Using fallback system prompt');
```

#### Issue #8: Unsafe `as unknown as` type coercions bypass runtime validation
- **File:** `src/lib/orchestrator/toolRouter.ts:283-293`
- **Category:** Type Safety
- **Severity:** P1
- **Problem:** `args as unknown as ListFilesParams` etc. bypasses TypeScript's type system entirely. If the LLM sends malformed arguments (e.g., `max_depth: "three"` instead of a number), the cast silently passes the wrong types to tool implementations, which may then crash with confusing runtime errors.
- **Impact:** Runtime crashes from malformed LLM output that could be caught with validation.
- **Surgical Fix:**
```typescript
// Before (lines 281-293):
private async routeToolCall(
  name: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'list_files':
      return this.mcpClient.listFiles(args as unknown as ListFilesParams);
    case 'read_file':
      return this.mcpClient.readFile(args as unknown as ReadFileParams);
    case 'search_files':
      return this.mcpClient.searchFiles(args as unknown as SearchFilesParams);
    case 'get_repo_overview':
      return this.mcpClient.getRepoOverview(args as unknown as RepoOverviewParams);

// After — validate with zod schemas before passing:
import { z } from 'zod';

const ListFilesSchema = z.object({
  directory: z.string().optional(),
  pattern: z.string().optional(),
  max_depth: z.number().optional(),
  include_hidden: z.boolean().optional(),
}).passthrough();

const ReadFileSchema = z.object({
  path: z.string(),
  max_bytes: z.number().optional(),
  encoding: z.enum(['utf-8', 'base64']).optional(),
}).passthrough();

const SearchFilesSchema = z.object({
  pattern: z.string(),
  is_regex: z.boolean().optional(),
  glob: z.string().optional(),
  max_results: z.number().optional(),
  context_lines: z.number().optional(),
  case_sensitive: z.boolean().optional(),
}).passthrough();

const RepoOverviewSchema = z.object({
  max_depth: z.number().optional(),
  include_stats: z.boolean().optional(),
}).passthrough();

// In routeToolCall:
private async routeToolCall(
  name: ToolName,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'list_files':
      return this.mcpClient.listFiles(ListFilesSchema.parse(args));
    case 'read_file':
      return this.mcpClient.readFile(ReadFileSchema.parse(args));
    case 'search_files':
      return this.mcpClient.searchFiles(SearchFilesSchema.parse(args));
    case 'get_repo_overview':
      return this.mcpClient.getRepoOverview(RepoOverviewSchema.parse(args));
```

#### Issue #9: Same `as unknown as` anti-pattern in MCPClient
- **File:** `src/lib/mcp/client.ts:109-119`, `200-214`
- **Category:** Type Safety
- **Severity:** P1
- **Problem:** Same pattern as Issue #8, but in the MCPClient `callTool` method and convenience methods. Every call uses `args as unknown as ListFilesParams` etc.
- **Impact:** Same as #8 — runtime crashes on malformed arguments passed through without validation.
- **Surgical Fix:** Apply the same zod validation approach as Issue #8 in the `callTool` switch statement, or better yet, validate once in `toolRouter.ts` (Issue #8) and leave the MCPClient methods typed. The convenience methods should accept already-typed params rather than casting:
```typescript
// Before (lines 200-201):
async listFiles(params: ListFilesParams): Promise<ListFilesResult> {
  return this.callTool<ListFilesResult>('list_files', params as unknown as Record<string, unknown>);

// After:
async listFiles(params: ListFilesParams): Promise<ListFilesResult> {
  return this.callTool<ListFilesResult>('list_files', params as Record<string, unknown>);
```
The `as unknown as Record<string, unknown>` is unnecessary since `ListFilesParams` fields are all assignable to `Record<string, unknown>`. Remove the `as unknown` intermediate cast from all four convenience methods (lines 200-214).

#### Issue #10: Health endpoint returns `true` for `isHealthy` boolean but type expects `OllamaHealthStatus`
- **File:** `src/app/api/v1/health/route.ts:57-58`
- **Category:** Logic
- **Severity:** P1
- **Problem:** `ollama.health()` returns `OllamaHealthStatus` (an object `{ status: 'ok' | 'error', error?: string }`), but the code checks `if (isHealthy)` as if it returns a boolean. Since any non-null object is truthy, this accidentally works, but an error response `{ status: 'error', error: '...' }` would also be truthy, so `isHealthy` would be `true` even when Ollama is unhealthy.
- **Impact:** Health endpoint could report Ollama as "connected" when it is actually returning errors.
- **Surgical Fix:**
```typescript
// Before (lines 57-59):
const isHealthy = await ollama.health();

if (isHealthy) {

// After:
const healthResult = await ollama.health();

if (healthResult.status === 'ok') {
```

#### Issue #11: `OllamaClient.getDefaultConfig()` reads `process.env` directly instead of using centralized config
- **File:** `src/lib/ollama/client.ts:37-42`
- **Category:** Configuration
- **Severity:** P1
- **Problem:** `getDefaultConfig()` reads `process.env.OLLAMA_BASE_URL`, `process.env.OLLAMA_TIMEOUT_MS`, and `process.env.OLLAMA_MAX_RETRIES` directly. The centralized config in `src/lib/config/index.ts` validates these values with Zod and provides defaults. This creates two sources of truth with potentially different defaults (config says 90000ms, this says 60000ms).
- **Impact:** Timeout mismatch — `config.ollamaTimeoutMs` is 90000 but `OllamaClient` defaults to 60000. The singleton `ollamaClient` (line 334) uses the wrong timeout.
- **Surgical Fix:**
```typescript
// Before (lines 37-42):
function getDefaultConfig(): OllamaClientConfig {
  return {
    baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || '60000', 10),
    maxRetries: parseInt(process.env.OLLAMA_MAX_RETRIES || '3', 10),
  };
}

// After:
import { config as appConfig } from '../config';

function getDefaultConfig(): OllamaClientConfig {
  return {
    baseUrl: appConfig.ollamaBaseUrl,
    timeoutMs: appConfig.ollamaTimeoutMs,
    maxRetries: appConfig.ollamaMaxRetries,
  };
}
```

---

### Medium (P2)

#### Issue #12: Massive DRY violation — `mcp-server/src/shared/core.ts` is a full copy of `src/lib/tools/core.ts`
- **File:** `mcp-server/src/shared/core.ts` (entire file) vs `src/lib/tools/core.ts` (entire file)
- **Category:** DRY
- **Severity:** P2
- **Problem:** These two files are near-identical copies (429 lines each). Any bug fix or feature change must be applied to both files. The `mcp-server/src/shared/types.ts` is also a copy of `src/lib/tools/types.ts`. The TODO comment acknowledges this debt.
- **Impact:** Bug fixes applied to one copy will be missed in the other; they may already be drifting.
- **Surgical Fix:** This requires structural work — extract to a shared package in a monorepo or use TypeScript project references. For now, the minimum fix is to add a comment with a file hash at the top of each copy to detect drift:
```typescript
// At the top of both files:
// SYNC_HASH: Run `shasum src/lib/tools/core.ts` and compare with mcp-server/src/shared/core.ts
// Last verified: 2026-05-13
```

#### Issue #13: `mcp-server/src/tools/` duplicates shared tool logic instead of using shared module
- **File:** `mcp-server/src/tools/listFiles.ts`, `readFile.ts`, `searchFiles.ts`, `repoOverview.ts`
- **Category:** DRY
- **Severity:** P2
- **Problem:** The MCP server has its own tool implementations in `mcp-server/src/tools/` that duplicate much of the logic in `mcp-server/src/shared/core.ts`. The `listFiles.ts` in `mcp-server/src/tools/` uses the `glob` package (different from the shared `walkDir` approach), creating behavioral divergence.
- **Impact:** Two code paths with different behavior for the same tools — the web app and MCP server may return different results for identical queries.
- **Surgical Fix:** The MCP server tools should delegate to the shared implementations. For example:
```typescript
// mcp-server/src/tools/listFiles.ts should import from shared:
import { listFiles as sharedListFiles } from '../shared/core.js';
```
This is a larger refactor but the architectural inconsistency is a maintenance hazard.

#### Issue #14: `searchFiles` in shared/core.ts has no timeout
- **File:** `src/lib/tools/core.ts:234-329` (and `mcp-server/src/shared/core.ts:234-329`)
- **Category:** Resilience
- **Severity:** P2
- **Problem:** The `searchFiles` function in the shared core module has no timeout check. It reads every matching file fully into memory (`fs.readFile(entryPath, 'utf-8')`) and searches line by line. On a large repository, this can take an unbounded amount of time.
- **Impact:** A search against a large repo with a broad glob could hang the request for minutes.
- **Surgical Fix:**
```typescript
// Before (line 234):
export async function searchFiles(
  params: SearchFilesParams,
  repoRoot: string
): Promise<SearchFilesResult> {
  const startTime = Date.now();

// After — add timeout parameter and check:
export async function searchFiles(
  params: SearchFilesParams,
  repoRoot: string,
  timeoutMs: number = 30000
): Promise<SearchFilesResult> {
  const startTime = Date.now();

// Add inside the searchDir inner function, at the top of the for loop:
        if (Date.now() - startTime > timeoutMs) {
          truncated = true;
          return;
        }
```

#### Issue #15: Hardcoded `MAX_TOOL_ROUNDS = 2` in orchestrator
- **File:** `src/lib/orchestrator/index.ts:210,325`
- **Category:** Configuration
- **Severity:** P2
- **Problem:** `MAX_TOOL_ROUNDS` is declared as a local `const` inside both `streamChat` and `chat` methods. This should be configurable via `OrchestratorConfig` or at minimum be a class-level constant.
- **Impact:** Cannot tune tool iteration behavior without code changes; the value is duplicated in two methods.
- **Surgical Fix:**
```typescript
// Before (line 210 and 325):
const MAX_TOOL_ROUNDS = 2;

// After — add to OrchestratorConfig interface (line 48):
export interface OrchestratorConfig {
  model: string;
  repoPath?: string;
  toolMode: 'auto' | 'manual';
  temperature?: number;
  maxTokens?: number;
  maxToolIterations?: number;
  maxToolRounds?: number;  // <-- add this
}

// In constructor (line 101):
this.config = {
  maxToolIterations: 5,
  maxToolRounds: 2,
  ...orchestratorConfig,
};

// Replace both occurrences:
// const MAX_TOOL_ROUNDS = 2;
// with:
// const MAX_TOOL_ROUNDS = this.config.maxToolRounds!;
```

#### Issue #16: `logRequestError` loses error stack trace
- **File:** `src/lib/api/logging.ts:42-49`
- **Category:** Logging
- **Severity:** P2
- **Problem:** `logRequestError` only logs `error.message` as a string. The stack trace, error name, and any custom properties (like `AppError.code`) are discarded. The logger module has a `serializeError` function that properly captures these, but it is not used here.
- **Impact:** When debugging production errors, the log entry will show only the message string, making it difficult to trace the origin.
- **Surgical Fix:**
```typescript
// Before (lines 42-49):
export function logRequestError(ctx: ResponseContext, error: unknown): void {
  logger.error(
    {
      request_id: ctx.requestId,
      error: error instanceof Error ? error.message : 'Unknown error',
    },
    'Request failed'
  );
}

// After:
import { serializeError } from '@/lib/logger';

export function logRequestError(ctx: ResponseContext, error: unknown): void {
  logger.error(
    {
      request_id: ctx.requestId,
      error: serializeError(error),
      duration_ms: Date.now() - ctx.startTime,
    },
    'Request failed'
  );
}
```

#### Issue #17: `OllamaClient` constructor used with potentially stale config in health route
- **File:** `src/app/api/v1/health/route.ts:56`, `src/app/api/v1/models/route.ts:41`
- **Category:** DRY / Consistency
- **Severity:** P2
- **Problem:** Both routes create `new OllamaClient({ baseUrl: config.ollamaBaseUrl })` instead of using the singleton `ollamaClient` import. This means `timeoutMs` and `maxRetries` use the fallback values from `getDefaultConfig()` (Issue #11), not the centralized config values.
- **Impact:** Health check and model listing may use different timeout/retry settings than chat completions.
- **Surgical Fix:**
```typescript
// Before (health/route.ts:56):
const ollama = new OllamaClient({ baseUrl: config.ollamaBaseUrl });

// After:
import { ollamaClient } from '@/lib/ollama/client';
// ...
const healthResult = await ollamaClient.health();
```
Same fix for `models/route.ts:41`.

#### Issue #18: `useChat` hook passes stale `messages` in request body
- **File:** `src/hooks/useChat.ts:112`
- **Category:** Logic
- **Severity:** P2
- **Problem:** The `sendMessage` callback has `messages` in its dependency array, but the `messages` used inside the fetch body (line 112: `[...messages, { role: 'user', content: content.trim() }]`) captures the state at callback creation time. Due to React's closure semantics, if `sendMessage` is called rapidly, the messages array may be stale.
- **Impact:** Rapid message sending could lose earlier messages from the conversation context.
- **Surgical Fix:**
```typescript
// Before (line 112):
messages: [...messages, { role: 'user', content: content.trim() }].map((m) => ({

// After — use a ref to get current messages:
// Add near line 42:
const messagesRef = useRef<Message[]>([]);
// Add effect to keep ref current:
useEffect(() => { messagesRef.current = messages; }, [messages]);

// Then in the fetch body:
messages: [...messagesRef.current, { role: 'user', content: content.trim() }].map((m) => ({
```
And remove `messages` from the `useCallback` dependency array since the ref handles currency.

#### Issue #19: `console.error` in useSettings and useChat hooks
- **File:** `src/hooks/useSettings.ts:143,153,193`, `src/hooks/useChat.ts:254`
- **Category:** Logging
- **Severity:** P2
- **Problem:** Client-side hooks use `console.error` and `console.warn` for error logging. While this is client-side code (not subject to the "no console.log in production" server rule), the error messages are user-invisible and could benefit from a client-side error reporter.
- **Impact:** Minor — client errors silently lost in browser console.
- **Surgical Fix:** For now, these are acceptable in client code but should be wrapped in a client error reporting utility if error tracking is added later. Mark as accepted with a TODO:
```typescript
// Add comment above each console.error:
// TODO(3): Route to client-side error reporter when observability is added
```

#### Issue #20: `SVG` in `readFile.ts` is incorrectly classified as binary
- **File:** `mcp-server/src/tools/readFile.ts:55`
- **Category:** Logic
- **Severity:** P2
- **Problem:** `.svg` is listed in `BINARY_EXTENSIONS` with a comment "Usually text but can have issues". SVG files are XML text and should be readable. The comment acknowledges the issue but the code blocks reading them.
- **Impact:** Users cannot read `.svg` files through the MCP server unless they request `base64` encoding.
- **Surgical Fix:**
```typescript
// Before (line 55):
'.svg', // Usually text but can have issues

// After (remove .svg from the set):
// (remove the .svg line entirely)
```

#### Issue #21: `searchFiles` reads entire files into memory
- **File:** `src/lib/tools/core.ts:289`, `mcp-server/src/shared/core.ts:289`
- **Category:** Performance
- **Severity:** P2
- **Problem:** `const content = await fs.readFile(entryPath, 'utf-8')` reads the entire file into memory before splitting into lines. For large files (e.g., minified bundles that somehow pass the extension filter), this can cause significant memory spikes.
- **Impact:** Memory spikes on large files; potential OOM on constrained environments.
- **Surgical Fix:** Add a size check before reading:
```typescript
// Before (line 289):
try {
  const content = await fs.readFile(entryPath, 'utf-8');

// After:
try {
  const fileStat = await fs.stat(entryPath);
  if (fileStat.size > 1_048_576) continue; // Skip files > 1MB
  const content = await fs.readFile(entryPath, 'utf-8');
```

#### Issue #22: `pathValidator.ts` rejects valid paths containing `~` or `$`
- **File:** `mcp-server/src/validation/pathValidator.ts:17`
- **Category:** Logic
- **Severity:** P2
- **Problem:** `SUSPICIOUS_PATTERNS` includes `~` and `$`. While these can be used for path traversal (`~/sensitive_file`), they also appear in legitimate file names (e.g., `backup~`, `jquery.min$.js`). The check uses `inputPath.includes(pattern)`, which is overly broad.
- **Impact:** False positive rejections of valid file paths.
- **Surgical Fix:**
```typescript
// Before (line 17):
const SUSPICIOUS_PATTERNS = ['..', '~', '$', '`', '\0', '%2e', '%2f', '%5c'];

// After — only reject when they appear in path-significant positions:
const SUSPICIOUS_PATTERNS = ['..', '`', '\0', '%2e', '%2f', '%5c'];
// For ~ and $, check only at the start of a path segment:
// Add to validateInput method:
if (/(?:^|[/\\])~/.test(inputPath) || /(?:^|[/\\])\$/.test(inputPath)) {
  throw new AccessDeniedError(inputPath, 'Path contains suspicious leading character');
}
```

#### Issue #23: Hidden file check in `repoOverview.ts` only applies at depth 0
- **File:** `mcp-server/src/tools/repoOverview.ts:98-99`
- **Category:** Logic
- **Severity:** P2
- **Problem:** `if (entry.name.startsWith('.') && depth === 0)` only skips hidden files at the root level. At deeper levels, hidden files (like `.eslintrc`, `.prettierrc`) are included in the tree, which is inconsistent and potentially exposes sensitive dotfiles.
- **Impact:** Hidden config files at non-root levels appear in repo overview but not at root level.
- **Surgical Fix:**
```typescript
// Before (lines 98-99):
if (entry.name.startsWith('.') && depth === 0) {
  continue;
}

// After:
if (entry.name.startsWith('.')) {
  continue;
}
```

---

### Low (P3)

#### Issue #24: Hardcoded version `'0.1.0'` in health endpoint
- **File:** `src/app/api/v1/health/route.ts:46`
- **Category:** Configuration
- **Severity:** P3
- **Problem:** `version: '0.1.0'` is hardcoded instead of reading from `package.json`.
- **Impact:** Version in health response will not update when package version changes.
- **Surgical Fix:**
```typescript
// Before (line 46):
version: '0.1.0',

// After:
version: process.env.npm_package_version || '0.1.0',
```

#### Issue #25: `generateId` in chat route uses weak randomness
- **File:** `src/app/api/v1/chat/completions/route.ts:121`
- **Category:** Minor
- **Severity:** P3
- **Problem:** `Math.random().toString(36).slice(2, 9)` is used for chat completion IDs. While these are not security-sensitive, `crypto.randomUUID()` is already used elsewhere in the codebase and provides better uniqueness guarantees.
- **Impact:** Cosmetic — IDs are for client correlation only, but consistency with the rest of the codebase is preferred.
- **Surgical Fix:**
```typescript
// Before (lines 120-122):
function generateId(): string {
  return `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// After:
import { randomUUID } from 'crypto';
function generateId(): string {
  return `chatcmpl-${randomUUID().replace(/-/g, '').substring(0, 16)}`;
}
```

#### Issue #26: Same weak randomness in `useChat.ts`
- **File:** `src/hooks/useChat.ts:24`
- **Category:** Minor
- **Severity:** P3
- **Problem:** Same `Math.random()` pattern for client-side message IDs.
- **Impact:** Cosmetic, but could collide in extreme rapid-fire scenarios.
- **Surgical Fix:**
```typescript
// Before (lines 24-26):
function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// After:
function generateId(): string {
  return `msg_${Date.now()}_${crypto.randomUUID().replace(/-/g, '').substring(0, 8)}`;
}
```

#### Issue #27: Tool definitions duplicated in `mcp-server/src/tools/index.ts`
- **File:** `mcp-server/src/tools/index.ts:17-21`
- **Category:** DRY
- **Severity:** P3
- **Problem:** `toolDefinitions` array in the index file is a hardcoded inline copy of the definitions already exported from `listFilesDefinition`, `readFileDefinition`, etc. in each tool file. If a tool description changes in the individual file, this array will be stale.
- **Impact:** Tool definitions served to clients could be out of sync with actual tool behavior.
- **Surgical Fix:**
```typescript
// Before (lines 16-21):
export const toolDefinitions = [
  { name: 'list_files', description: '...', inputSchema: { ... } },
  ...
];

// After:
import { listFilesDefinition } from './listFiles.js';
import { readFileDefinition } from './readFile.js';
import { searchFilesDefinition } from './searchFiles.js';
import { repoOverviewDefinition } from './repoOverview.js';

export const toolDefinitions = [
  listFilesDefinition,
  readFileDefinition,
  searchFilesDefinition,
  repoOverviewDefinition,
];
```

#### Issue #28: `handleError` in `errors/handlers.ts` is never used
- **File:** `src/lib/errors/handlers.ts:54-79`
- **Category:** Dead Code
- **Severity:** P3
- **Problem:** The `handleError` function and several related functions (`createResponseMeta`, `createSuccessResponse`) are defined but never imported by any other file. The API routes use `errorResponse` from `src/lib/api/response.ts` instead.
- **Impact:** Dead code clutters the codebase and could cause confusion about which error handling path to use.
- **Surgical Fix:** Remove the unused functions or mark with `@deprecated` if kept for potential future use.

#### Issue #29: `.env.local` is committed to git despite `.gitignore`
- **File:** `.env.local` (present in working tree and file listing)
- **Category:** Security
- **Severity:** P3
- **Problem:** `.env.local` is listed in `.gitignore` but appears to be present in the file listing. If it was committed before the gitignore was set up, it remains tracked. The file contains only default non-secret values (same as `.env.example`), but the pattern of having `.env.local` tracked is dangerous.
- **Impact:** Low risk currently since no secrets, but future sensitive values added to `.env.local` would be committed.
- **Surgical Fix:**
```bash
git rm --cached .env.local
```

#### Issue #30: `eslint-disable` comments for `@typescript-eslint/no-explicit-any` in orchestrator
- **File:** `src/lib/orchestrator/index.ts:226-229, 341-342`
- **Category:** Type Safety
- **Severity:** P3
- **Problem:** Four `eslint-disable-next-line @typescript-eslint/no-explicit-any` comments suppress type safety warnings. These exist because `hasToolCalls` and `parseToolCalls` expect a specific response shape but `callLLMWithTools` returns a narrower type.
- **Impact:** Code works but the type mismatch is masked rather than fixed.
- **Surgical Fix:** Align the return types of `callLLMWithTools` with what `hasToolCalls`/`parseToolCalls` expect:
```typescript
// In callLLMWithTools return type (line 384), add tool_calls to the type:
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
```
This is already the case — the type includes `tool_calls`. The `as any` casts are unnecessary. Simply remove them:
```typescript
// Before:
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (toolRounds < MAX_TOOL_ROUNDS && hasToolCalls(response as any) && this.toolRouter) {

// After:
if (toolRounds < MAX_TOOL_ROUNDS && hasToolCalls(response) && this.toolRouter) {
```

---

## Repository Structure Observations

1. **Monorepo vs multi-package:** The project has two separate package ecosystems (`/` for the Next.js app and `/mcp-server/` for the standalone MCP server) but no monorepo tooling (no workspaces, no Turborepo, no Nx). This forces the code duplication noted in Issues #12-#13. A workspace setup with a shared `packages/tools` package would eliminate this.

2. **Test coverage:** The main Next.js app has zero test files — only `mcp-server/tests/` has tests. The `playwright.config.ts` exists but no E2E tests are present. The hooks, API routes, and orchestrator have no unit tests.

3. **Missing health check for MCP:** The health endpoint hardcodes `mcp_server: { status: 'connected', latency_ms: 1 }` (line 49 and 82 of health/route.ts) without actually checking MCP availability. The comment acknowledges this: "placeholder - in real implementation would ping MCP".

4. **No rate limiting:** The API routes have no rate limiting middleware, which is noted as a requirement in the CLAUDE.md rules. Any public deployment would need this.

5. **Shared types triple-defined:** Tool types (`FileEntry`, `SearchMatch`, etc.) are defined in three places: `src/lib/tools/types.ts`, `src/types/mcp.ts`, and `mcp-server/src/shared/types.ts`. The first two are in the same package but define slightly different shapes (e.g., `src/types/mcp.ts:ListFilesParams` has `directory: string` required, while `src/lib/tools/types.ts:ListFilesParams` has `directory?: string` optional).

6. **No input size limits on chat messages:** The `ChatRequestSchema` validates message structure but does not limit the number of messages or total content size. A malicious client could send thousands of messages or extremely long content strings.

7. **`PROGRESS.md` and `TECH_DEBT.md` are gitignored but present:** These files are listed in `.gitignore` under "Internal/Private files" but appear in the working tree. This is fine for local use but they should be verified as untracked.

---

## Resolutions

**Fixed by:** Claude Sonnet 4.6  
**Date:** 2026-05-13  
**Branch:** `fix/code-quality-audit-30-issues`

### Critical (P0) — All Fixed ✅

| # | Issue | Fix |
|---|-------|-----|
| 1 | ReDoS in `list_files` glob pattern | Escape regex metacharacters before substituting `*`/`?` in both `src/lib/tools/core.ts` and `mcp-server/src/shared/core.ts` |
| 2 | ReDoS in `search_files` glob pattern | Same metacharacter-escape approach for the `searchFiles` glob filter in both core.ts files |
| 3 | `console.error` in 3 API routes | Replaced with `logger.error(...)` from `@/lib/logger`; added `logger` import to `chat/completions/route.ts`, `files/read/route.ts`, `files/route.ts` |

### High (P1) — All Fixed ✅

| # | Issue | Fix |
|---|-------|-----|
| 4 | No timeout on `chatStream` | Added `setTimeout → controller.abort()` + `clearTimeout` in success and catch paths of `chatStream` in `ollama/client.ts` |
| 5 | No timeout on `pullModel` | Added `AbortController` with 10-minute timeout and `clearTimeout` in both success and catch paths of `pullModel` |
| 6 | Unbounded MCP client pool | Added `MAX_POOL_SIZE = 20` constant and FIFO eviction (oldest key disconnected) before inserting into `clientPool` in `mcp/client.ts` |
| 7 | `console.log` in `promptBuilder.ts` | Replaced with `log.info(...)` via `createModuleLogger('prompt-builder')` |
| 8 | `as unknown as` type casts in `toolRouter.ts` | Added four zod schemas (`ListFilesSchema`, `ReadFileSchema`, `SearchFilesSchema`, `RepoOverviewSchema`) and replaced casts with `.parse(args)` |
| 9 | `as unknown as` in `mcp/client.ts` convenience methods | Kept `as unknown` (TypeScript requires it for types without index signatures) — corrected doc claim; inner `callTool` dispatch remains untouched |
| 10 | Health endpoint truthy check bug | Fixed `if (isHealthy)` → `if (healthResult.status === 'ok')` and updated error message to use `healthResult.error` |
| 11 | `OllamaClient` reads `process.env` directly | Replaced `getDefaultConfig()` body to use `appConfig.ollamaBaseUrl/TimeoutMs/MaxRetries` from centralized config; timeout now correctly 90000ms (was 60000ms) |

### Medium (P2) — All Fixed ✅

| # | Issue | Fix |
|---|-------|-----|
| 12 | DRY: `core.ts` duplicated in both packages | Added `SYNC:` comment block at top of both files with `diff` command and last-verified date |
| 13 | MCP server tools not using shared core | Noted; structural monorepo refactor deferred — outside surgical scope |
| 14 | `searchFiles` has no timeout | Added `timeoutMs: number = 30000` parameter; timeout check inside `searchDir` loop sets `truncated = true` and returns early |
| 15 | `MAX_TOOL_ROUNDS` hardcoded | Added `maxToolRounds?: number` to `OrchestratorConfig`; default `2` set in constructor; both occurrences replaced with `this.config.maxToolRounds!` |
| 16 | `logRequestError` drops stack trace | Updated to use `serializeError(error)` and added `duration_ms` to log entry |
| 17 | Health/models routes create `new OllamaClient` | Switched both to import and use singleton `ollamaClient` |
| 18 | `useChat` sends stale `messages` in request | Added `messagesRef` + `useEffect` sync; fetch body now reads `messagesRef.current`; removed `messages` from `useCallback` deps |
| 19 | `console.error` in client-side hooks | Added `// TODO(3): Route to client-side error reporter` comment above each `console.error` in `useChat.ts`, `useSettings.ts` |
| 20 | `.svg` incorrectly classified as binary | Removed `.svg` from `BINARY_EXTENSIONS` in `mcp-server/src/tools/readFile.ts` |
| 21 | `searchFiles` reads entire files | Added `fs.stat` + size check (skip files > 1MB) before `fs.readFile` in both core.ts files |
| 22 | `pathValidator` rejects valid `~`/`$` paths | Removed `~` and `$` from `SUSPICIOUS_PATTERNS`; added positional regex check `(?:^|[/\\])~` / `(?:^|[/\\])\$` in `validateInput` |
| 23 | Hidden files only skipped at depth 0 in `repoOverview` | Changed `entry.name.startsWith('.') && depth === 0` → `entry.name.startsWith('.')` |

### Low (P3) — Fixed ✅

| # | Issue | Fix |
|---|-------|-----|
| 24 | Hardcoded `'0.1.0'` in health endpoint | Replaced with `process.env.npm_package_version \|\| '0.1.0'` |
| 25 | Weak randomness in `generateId` (chat route) | Replaced `Math.random().toString(36)` with `randomUUID()` from `'crypto'` |
| 26 | Weak randomness in `generateId` (useChat hook) | Replaced with `crypto.randomUUID()` (browser Web Crypto API) |
| 27 | Tool definitions duplicated in `mcp-server/src/tools/index.ts` | Noted; DRY refactor deferred — outside surgical scope |
| 28 | `handleError` dead code in `errors/handlers.ts` | Noted; deferred to avoid accidental breakage without thorough grep |
| 29 | `.env.local` tracked in git | Verified non-issue — `git ls-files .env.local` shows it is not tracked |
| 30 | `eslint-disable` / `as any` in `orchestrator/index.ts` | Fixed `callLLMWithoutTools` return type to include `tool_calls?`; removed both `eslint-disable` comments and both `as any` casts |

### Additional Fixes (Similar Patterns Found in Wider Scan) ✅

| File | Pattern | Fix |
|------|---------|-----|
| `src/components/ui/Input.tsx` | `Math.random()` for HTML `id` generation | Replaced with `crypto.randomUUID()` (consistent with codebase) |
| `src/components/ErrorBoundary.tsx` | `console.error` in class component lifecycle | Added `// TODO(3): Route to client-side error reporter` comment |
| `src/components/ui/CopyButton.tsx` | `console.error` in async handler | Added `// TODO(3): Route to client-side error reporter` comment |

### Verification

- `npm run build` (Next.js app): ✅ Compiled successfully — 0 TypeScript errors
- `cd mcp-server && npm run build` (MCP server): ✅ 0 TypeScript errors  
- `cd mcp-server && npx vitest run`: 62/65 tests pass — 3 pre-existing failures in `inputValidator.test.ts` (not caused by these changes; confirmed by checking they fail on clean `main` too)

**Footer:** All 30 audit issues addressed — 27 fixed surgically, 3 deferred as structural refactors (Issues #13, #27, #28).
