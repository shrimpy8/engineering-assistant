# Engineering Assistant API Reference

**Version:** 1.1.0
**Base URL:** `http://localhost:3000/api/v1`

This document describes the REST API endpoints for the Engineering Assistant. All endpoints follow Stripe-style conventions with consistent response shapes.

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Response Format](#response-format)
4. [Endpoints](#endpoints)
   - [Health Check](#health-check)
   - [Models](#models)
   - [Files - List Directory](#files---list-directory)
   - [Files - Read Content](#files---read-content)
   - [Chat Completions](#chat-completions)
5. [Error Handling](#error-handling)
6. [Examples](#examples)

---

## Overview

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Predictable | Consistent response shapes across endpoints |
| Resource-oriented | Nouns over verbs in paths |
| Versioned | `/api/v1/` prefix for all endpoints |
| Self-documenting | Descriptive error codes and messages |
| Traceable | Request ID in every response |

### Headers

All requests should include:

```http
Content-Type: application/json
X-Request-ID: <optional-client-provided-id>
```

If `X-Request-ID` is not provided, the server generates one.

---

## Authentication

Currently, no authentication is required. The API is designed for local use only.

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-11T12:00:00.000Z",
    "duration_ms": 45
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "error_code",
    "message": "Human-readable description",
    "type": "validation_error",
    "param": "field_name",
    "details": [],
    "doc_url": "docs/errors/invalid_request"
  },
  "meta": {
    "request_id": "req_abc123",
    "timestamp": "2026-01-11T12:00:00.000Z"
  }
}
```

---

## Endpoints

### Health Check

Check service health and dependency status.

**Endpoint:** `GET /api/v1/health`

**Response:**

```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "version": "0.1.0",
    "services": {
      "ollama": {
        "status": "connected",
        "latency_ms": 15
      },
      "mcp_server": {
        "status": "connected",
        "latency_ms": 5
      }
    }
  },
  "meta": {
    "request_id": "req_health_123",
    "timestamp": "2026-01-11T12:00:00.000Z"
  }
}
```

**Status Values:**
- `healthy`: All services operational
- `degraded`: Some services unavailable
- `unhealthy`: Critical services down

**Example:**

```bash
curl http://localhost:3000/api/v1/health
```

---

### Models

List available Ollama models.

**Endpoint:** `GET /api/v1/models`

**Response:**

```json
{
  "success": true,
  "data": {
    "models": [
      {
        "name": "llama3.1:8b",
        "size": 4661224448,
        "modified_at": "2026-01-10T10:00:00.000Z",
        "digest": "sha256:abc123..."
      },
      {
        "name": "codellama:7b",
        "size": 3825819648,
        "modified_at": "2026-01-09T15:00:00.000Z",
        "digest": "sha256:def456..."
      }
    ]
  },
  "meta": {
    "request_id": "req_models_456",
    "timestamp": "2026-01-11T12:00:00.000Z"
  }
}
```

**Example:**

```bash
curl http://localhost:3000/api/v1/models
```

**Default selection note:** The UI prefers code-focused models when multiple options are available.

### Models - Pull Model

Pull a model via Ollama and stream progress updates.

**Endpoint:** `POST /api/v1/models/pull`

**Request Body:**

```json
{
  "model": "llama3.1:8b"
}
```

**Response (SSE):**

```
data: {"status":"pulling manifest"}

data: {"status":"downloading","completed":12345,"total":67890}

data: {"type":"done"}

data: [DONE]
```

**Example:**

```bash
curl -N -X POST http://localhost:3000/api/v1/models/pull \
  -H "Content-Type: application/json" \
  -d '{"model":"llama3.1:8b"}'
```

---

### Files - List Directory

List files in a repository directory.

**Endpoint:** `GET /api/v1/files`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo | string | No | Repository root path (default: current working directory) |
| path | string | No | Relative path within repo (default: ".") |
| read | boolean | No | If true and path is a file, return file content |
| max_bytes | number | No | Maximum bytes to read when `read=true` (default: 100000, max: 10485760) |
| encoding | string | No | Output encoding when `read=true` ("utf-8" or "base64") |

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "src",
    "entries": [
      {
        "name": "components",
        "path": "src/components",
        "type": "directory",
        "modified_at": "2026-01-11T10:00:00.000Z"
      },
      {
        "name": "index.ts",
        "path": "src/index.ts",
        "type": "file",
        "size": 1234,
        "modified_at": "2026-01-11T10:00:00.000Z"
      }
    ]
  },
  "meta": {
    "request_id": "req_files_789",
    "timestamp": "2026-01-11T12:00:00.000Z",
    "duration_ms": 15
  }
}
```

**Examples:**

```bash
# List files in repository root
curl "http://localhost:3000/api/v1/files?repo=/Users/dev/myproject"

# List files in src directory
curl "http://localhost:3000/api/v1/files?repo=/Users/dev/myproject&path=src"

# Read file content with size cap
curl "http://localhost:3000/api/v1/files?repo=/Users/dev/myproject&path=src/index.ts&read=true&max_bytes=20000"
```

When `read=true`, the response includes `encoding` and `truncated`:

```json
{
  "success": true,
  "data": {
    "path": "src/index.ts",
    "content": "export function main() { ... }",
    "size": 1234,
    "modified_at": "2026-01-11T10:00:00.000Z",
    "encoding": "utf-8",
    "truncated": false
  },
  "meta": {
    "request_id": "req_files_790",
    "timestamp": "2026-01-11T12:00:00.000Z",
    "duration_ms": 8
  }
}
```

---

### Files - Read Content

Read file contents from the repository (per PRD Section 6.4.4).

**Endpoint:** `POST /api/v1/files/read`

**Request Body:**

```json
{
  "path": "src/index.ts",
  "repo_path": "/Users/dev/myproject",
  "max_bytes": 100000
}
```

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| path | string | Yes | Relative file path within repo |
| repo_path | string | Yes | Repository root path |
| max_bytes | number | No | Maximum bytes to read (default: 100000) |
| encoding | string | No | Output encoding ("utf-8" or "base64") |

**Response:**

```json
{
  "success": true,
  "data": {
    "path": "src/index.ts",
    "content": "export function main() { ... }",
    "size": 1234,
    "modified_at": "2026-01-11T10:00:00.000Z",
    "encoding": "utf-8",
    "truncated": false
  },
  "meta": {
    "request_id": "req_files_790",
    "timestamp": "2026-01-11T12:00:00.000Z",
    "duration_ms": 8
  }
}
```

**Example:**

```bash
# Read a specific file
curl -X POST http://localhost:3000/api/v1/files/read \
  -H "Content-Type: application/json" \
  -d '{
    "path": "src/index.ts",
    "repo_path": "/Users/dev/myproject"
  }'
```

---

### Chat Completions

Send a chat message and receive a streaming response. Uses OpenAI-compatible format.

**Endpoint:** `POST /api/v1/chat/completions`

**Request Body (PRD-compliant):**

```json
{
  "messages": [
    {
      "role": "user",
      "content": "Explain the authentication flow in this codebase"
    }
  ],
  "settings": {
    "model": "llama3.1:8b",
    "repo_path": "/path/to/repository",
    "temperature": 0.7,
    "max_tokens": 2048,
    "tool_mode": "auto"
  },
  "stream": true
}
```

**Backward-compatible:** The API also accepts flat fields (`model`, `repo_path`, etc.) for legacy clients.

**Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| messages | array | Yes | Conversation history |
| messages[].role | string | Yes | "system", "user", "assistant", or "tool" |
| messages[].content | string | Yes | Message content |
| settings.model | string | No | Ollama model name (uses default if not specified) |
| settings.repo_path | string | No | Repository path for context |
| settings.temperature | number | No | 0-2, default 0.7 |
| settings.max_tokens | number | No | Maximum tokens to generate |
| settings.tool_mode | string | No | "auto" (tools enabled) or "manual" (tools disabled) |
| stream | boolean | No | Enable SSE streaming, default true |

**Streaming Response (SSE):**

The response is a stream of Server-Sent Events in OpenAI-compatible format:

```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1704974400,"model":"llama3.1:8b","choices":[{"index":0,"delta":{"content":"Here is"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1704974400,"model":"llama3.1:8b","choices":[{"index":0,"delta":{"content":" the authentication"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1704974400,"model":"llama3.1:8b","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

In addition to OpenAI-compatible chunks, the stream also includes custom tool lifecycle
events and a final `done` event with usage metadata (used by the UI Tool Trace panel):

```
data: {"type":"tool_call","id":"tc_123","name":"search_files","status":"started","timestamp":"2026-01-11T12:00:00.000Z"}

data: {"type":"tool_call","id":"tc_123","name":"search_files","status":"completed","timestamp":"2026-01-11T12:00:00.500Z","duration_ms":500}

data: {"type":"done","usage":{"prompt_tokens":120,"completion_tokens":80,"total_tokens":200}}
```

**Manual Tool Mode Note:**
When `tool_mode` is `manual`, the API only exposes tools if the user explicitly
mentions a tool name (e.g. `read_file`, `search_files`) or says “use tool” in the prompt.

### Prompt Transparency

Return the system prompt for the current settings (read‑only).

**Endpoint:** `GET /api/v1/prompt`

**Query Parameters:**

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| repo_path | string | No | Repository root path |
| tool_mode | string | No | "auto" or "manual" |

**Response:**

```json
{
  "success": true,
  "data": {
    "prompt": "You are an expert software engineering assistant..."
  },
  "meta": {
    "request_id": "req_prompt_123",
    "timestamp": "2026-01-11T12:00:00.000Z"
  }
}
```

**Response Headers:**

| Header | Description |
|--------|-------------|
| Content-Type | text/event-stream |
| X-Request-ID | Unique request identifier |

**Non-Streaming Response:**

```json
{
  "success": true,
  "data": {
    "id": "chatcmpl-1704974400-abc123",
    "object": "chat.completion",
    "created": 1704974400,
    "model": "llama3.1:8b",
    "content": "The authentication flow uses JWT...",
    "tool_calls": [
      {
        "id": "tc_123",
        "name": "read_file",
        "arguments": { "path": "src/auth.ts" },
        "result": { "content": "..." },
        "duration_ms": 45
      }
    ],
    "usage": {
      "prompt_tokens": 150,
      "completion_tokens": 89,
      "total_tokens": 239
    }
  },
  "meta": {
    "request_id": "req_chat_101",
    "timestamp": "2026-01-11T12:00:00.000Z",
    "duration_ms": 3500
  }
}
```

**Example (curl with streaming):**

```bash
curl -N -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [{"role": "user", "content": "What does this project do?"}],
    "repo_path": "/Users/dev/myproject"
  }'
```

**Example (JavaScript):**

```javascript
const response = await fetch('/api/v1/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    model: 'llama3.1:8b',
    messages: [{ role: 'user', content: 'Explain the main function' }],
    repo_path: '/path/to/repo'
  })
});

const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ') && line !== 'data: [DONE]') {
      const event = JSON.parse(line.slice(6));
      if (event.choices?.[0]?.delta?.content) {
        process.stdout.write(event.choices[0].delta.content);
      }
    }
  }
}
```

---

## Error Handling

### Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| invalid_request | 400 | Malformed request |
| missing_parameter | 400 | Required parameter missing |
| invalid_parameter | 400 | Parameter value invalid |
| repo_path_invalid | 400 | Repository path format invalid |
| repo_path_not_found | 404 | Repository doesn't exist |
| file_not_found | 404 | File doesn't exist |
| access_denied | 403 | Path outside sandbox |
| ollama_unavailable | 502 | Cannot connect to Ollama |
| ollama_model_not_found | 404 | Model not installed |
| mcp_server_unavailable | 502 | MCP server not responding |
| internal_error | 500 | Unexpected server error |

### Error Response Example

```json
{
  "success": false,
  "error": {
    "code": "repo_path_not_found",
    "message": "The specified repository path does not exist",
    "type": "not_found_error",
    "param": "settings.repo_path"
  },
  "meta": {
    "request_id": "req_err_123",
    "timestamp": "2026-01-11T12:00:00.000Z"
  }
}
```

---

## Examples

### Complete Workflow

```bash
# 1. Check health
curl http://localhost:3000/api/v1/health

# 2. List models
curl http://localhost:3000/api/v1/models

# 3. List files in repo
curl "http://localhost:3000/api/v1/files?repo=/Users/dev/project"

# 4. Read a specific file
curl -X POST http://localhost:3000/api/v1/files/read \
  -H "Content-Type: application/json" \
  -d '{"path": "src/auth/index.ts", "repo_path": "/Users/dev/project"}'

# 5. Ask about the code
curl -N -X POST http://localhost:3000/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama3.1:8b",
    "messages": [
      {"role": "user", "content": "What is the purpose of the auth module?"}
    ],
    "repo_path": "/Users/dev/project"
  }'
```

### Python Example

```python
import requests
import json

BASE_URL = "http://localhost:3000/api/v1"

# Check health
health = requests.get(f"{BASE_URL}/health").json()
print(f"Status: {health['data']['status']}")

# List models
models = requests.get(f"{BASE_URL}/models").json()
print(f"Available models: {[m['name'] for m in models['data']['models']]}")

# Chat with streaming
response = requests.post(
    f"{BASE_URL}/chat/completions",
    json={
        "model": "llama3.1:8b",
        "messages": [{"role": "user", "content": "Explain this codebase"}],
        "repo_path": "/path/to/repo"
    },
    stream=True
)

for line in response.iter_lines():
    if line.startswith(b'data: ') and line != b'data: [DONE]':
        event = json.loads(line[6:])
        content = event.get('choices', [{}])[0].get('delta', {}).get('content', '')
        if content:
            print(content, end='', flush=True)
```

---

*Last updated: January 11, 2026*
