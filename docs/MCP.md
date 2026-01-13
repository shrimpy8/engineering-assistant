# MCP Tool Reference

**Version:** 1.0.0
**Protocol:** Model Context Protocol (MCP)

This document describes the MCP tools provided by the Engineering Assistant's local MCP server. These tools enable AI assistants to safely read and analyze code repositories.

---

## Table of Contents

1. [Overview](#overview)
2. [Security Model](#security-model)
3. [Tools](#tools)
   - [list_files](#list_files)
   - [read_file](#read_file)
   - [search_files](#search_files)
   - [get_repo_overview](#get_repo_overview)
4. [Error Handling](#error-handling)
5. [Examples](#examples)

---

## Overview

### What is MCP?

The Model Context Protocol (MCP) is a standardized interface for AI assistants to interact with external tools and data sources. Our MCP server provides read-only access to code repositories.

### Design Principles

| Principle | Implementation |
|-----------|----------------|
| Transparency | Every file access is visible in the Tool Trace |
| Security | All paths sandboxed within repository root |
| Read-only | No write, delete, or modify operations |
| Privacy | All processing happens locally |

### Server Configuration

```bash
# Start the MCP server
npm run mcp:start

# Development mode with hot reload
npm run mcp:dev
```

**Environment Variables:**

| Variable | Description | Default |
|----------|-------------|---------|
| `ALLOWED_REPO_ROOT` | Parent directory to sandbox repositories | (none) |
| `MAX_FILE_SIZE_BYTES` | Maximum file size to read (bytes) | 1048576 (1MB) |
| `SEARCH_TIMEOUT_MS` | Maximum search duration | 30000 (30s) |
| `MAX_SEARCH_RESULTS` | Maximum search matches | 100 |

---

## Security Model

### Path Sandboxing

All file operations are sandboxed within the configured repository root:

```
Repository Root: /Users/dev/myproject
├── src/         ✅ Accessible
├── docs/        ✅ Accessible
├── package.json ✅ Accessible
└── ../          ❌ Access Denied
```

### Protection Mechanisms

1. **Path Traversal Prevention**: `../` sequences are blocked
2. **Symlink Resolution**: Symlinks pointing outside the sandbox are denied
3. **Absolute Path Normalization**: All paths resolved to absolute form
4. **Real Path Validation**: Final path checked against allowed root

### Read-Only Access

The v1 MCP server provides only read operations:
- ✅ List files and directories
- ✅ Read file contents
- ✅ Search within files
- ✅ Get repository overview
- ❌ Create files
- ❌ Modify files
- ❌ Delete files
- ❌ Execute commands

---

## Tools

**Note:** These are MCP tools (server-side) and are distinct from the REST
`/api/v1/files` endpoint. The REST endpoint now supports `max_bytes` and
`encoding` query params when `read=true`, but those are not MCP tool arguments.

### list_files

List files and directories within the repository.

**Name:** `list_files`

**Description:** List files and directories within the repository. Returns file paths, types, sizes, and modification dates.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| directory | string | No | "." | Directory path relative to repository root |
| pattern | string | No | - | Glob pattern to filter files (e.g., "*.ts") |
| max_depth | number | No | 3 | Maximum directory depth (1-10) |
| include_hidden | boolean | No | false | Include hidden files and directories |

#### Response

```json
{
  "files": [
    {
      "path": "src/components",
      "type": "directory"
    },
    {
      "path": "src/index.ts",
      "type": "file",
      "size": 1234,
      "modified_at": "2026-01-11T10:00:00.000Z"
    }
  ],
  "total_count": 45,
  "truncated": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| files | FileEntry[] | Array of file/directory entries |
| files[].path | string | Relative path from repository root |
| files[].type | "file" \| "directory" | Entry type |
| files[].size | number | File size in bytes (files only) |
| files[].modified_at | string | ISO 8601 modification timestamp |
| total_count | number | Total entries found |
| truncated | boolean | True if results were limited (max 500) |

#### Example

```json
// Request
{
  "name": "list_files",
  "arguments": {
    "directory": "src",
    "pattern": "*.ts",
    "max_depth": 2
  }
}

// Response
{
  "files": [
    {
      "path": "src/index.ts",
      "type": "file",
      "size": 892,
      "modified_at": "2026-01-11T14:30:00.000Z"
    },
    {
      "path": "src/utils/helpers.ts",
      "type": "file",
      "size": 2341,
      "modified_at": "2026-01-10T09:15:00.000Z"
    }
  ],
  "total_count": 2,
  "truncated": false
}
```

---

### read_file

Read the contents of a file from the repository.

**Name:** `read_file`

**Description:** Read the contents of a file from the repository. Supports text files (UTF-8) and binary files (base64).

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| path | string | Yes | - | File path relative to repository root |
| max_bytes | number | No | 100000 | Maximum bytes to read |
| encoding | string | No | "utf-8" | Output encoding: "utf-8" or "base64" |

#### Response

```json
{
  "path": "src/index.ts",
  "content": "import { App } from './app';\n\nexport function main() {\n  ...",
  "size": 1234,
  "modified_at": "2026-01-11T10:00:00.000Z",
  "encoding": "utf-8",
  "truncated": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| path | string | Requested file path |
| content | string | File content (UTF-8 or base64 encoded) |
| size | number | Original file size in bytes |
| modified_at | string | ISO 8601 modification timestamp |
| encoding | string | Content encoding used |
| truncated | boolean | True if content was truncated |

#### Binary File Handling

Binary files must use `base64` encoding:

```json
// Request for image
{
  "name": "read_file",
  "arguments": {
    "path": "assets/logo.png",
    "encoding": "base64"
  }
}

// Response
{
  "path": "assets/logo.png",
  "content": "iVBORw0KGgoAAAANSUhEUgAAA...",
  "size": 24576,
  "modified_at": "2026-01-11T10:00:00.000Z",
  "encoding": "base64",
  "truncated": false
}
```

#### Blocked File Extensions

The following extensions are blocked for UTF-8 encoding:

- Images: `.png`, `.jpg`, `.jpeg`, `.gif`, `.ico`, `.webp`, `.bmp`
- Archives: `.zip`, `.tar`, `.gz`, `.bz2`, `.7z`, `.rar`
- Executables: `.exe`, `.dll`, `.so`, `.dylib`, `.wasm`
- Compiled: `.pyc`, `.class`, `.o`, `.obj`
- Fonts: `.woff`, `.woff2`, `.ttf`, `.otf`, `.eot`
- Media: `.mp3`, `.mp4`, `.wav`, `.avi`, `.mov`
- Data: `.sqlite`, `.db`, `.pdf`

---

### search_files

Search for text patterns across repository files.

**Name:** `search_files`

**Description:** Search for text patterns across repository files. Returns matching lines with context.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| pattern | string | Yes | - | Search pattern (plain text or regex) |
| is_regex | boolean | No | false | Treat pattern as regular expression |
| glob | string | No | - | Glob pattern to filter files (e.g., "src/**/*.ts") |
| max_results | number | No | 50 | Maximum matches to return (1-1000) |
| context_lines | number | No | 2 | Lines of context around matches (0-10) |
| case_sensitive | boolean | No | false | Case-sensitive search |

#### Response

```json
{
  "matches": [
    {
      "path": "src/auth/login.ts",
      "line_number": 42,
      "line_content": "  const token = await authenticateUser(credentials);",
      "context": {
        "before": [
          "async function handleLogin(credentials: Credentials) {",
          "  validateCredentials(credentials);"
        ],
        "after": [
          "  return { success: true, token };",
          "}"
        ]
      }
    }
  ],
  "total_matches": 15,
  "files_searched": 127,
  "truncated": false,
  "duration_ms": 234
}
```

| Field | Type | Description |
|-------|------|-------------|
| matches | SearchMatch[] | Array of search matches |
| matches[].path | string | File containing the match |
| matches[].line_number | number | 1-indexed line number |
| matches[].line_content | string | Content of the matching line |
| matches[].context.before | string[] | Lines before the match |
| matches[].context.after | string[] | Lines after the match |
| total_matches | number | Total matches found |
| files_searched | number | Number of files searched |
| truncated | boolean | True if results were limited |
| duration_ms | number | Search duration in milliseconds |

#### Excluded Directories

Search automatically excludes:
- `node_modules/`
- `.git/`
- `dist/`
- `build/`
- `*.min.js`, `*.min.css`
- `package-lock.json`, `yarn.lock`
- `*.map`

#### Example: Regex Search

```json
// Find all function definitions
{
  "name": "search_files",
  "arguments": {
    "pattern": "function\\s+\\w+",
    "is_regex": true,
    "glob": "**/*.ts",
    "max_results": 20
  }
}
```

---

### get_repo_overview

Get a high-level overview of the repository structure.

**Name:** `get_repo_overview`

**Description:** Get a high-level overview of the repository structure and statistics including file counts and language breakdown.

#### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| max_depth | number | No | 2 | Maximum directory depth (1-5) |
| include_stats | boolean | No | true | Include file counts and language statistics |

#### Response

```json
{
  "root": "my-project",
  "structure": {
    "name": "my-project",
    "type": "directory",
    "children": [
      {
        "name": "src",
        "type": "directory",
        "children": [
          { "name": "index.ts", "type": "file", "size": 892 },
          { "name": "app.ts", "type": "file", "size": 2341 }
        ]
      },
      { "name": "package.json", "type": "file", "size": 1456 },
      { "name": "README.md", "type": "file", "size": 3200 }
    ]
  },
  "stats": {
    "total_files": 45,
    "total_directories": 12,
    "total_size": 156789,
    "languages": [
      { "extension": ".ts", "count": 28, "bytes": 89456 },
      { "extension": ".tsx", "count": 12, "bytes": 45678 },
      { "extension": ".json", "count": 3, "bytes": 12345 },
      { "extension": ".md", "count": 2, "bytes": 9310 }
    ]
  }
}
```

| Field | Type | Description |
|-------|------|-------------|
| root | string | Repository root directory name |
| structure | DirectoryNode | Directory tree structure |
| structure.name | string | Directory or file name |
| structure.type | "file" \| "directory" | Node type |
| structure.size | number | File size (files only) |
| structure.children | DirectoryNode[] | Child nodes (directories only) |
| stats | RepoStats | Repository statistics (if requested) |
| stats.total_files | number | Total file count |
| stats.total_directories | number | Total directory count |
| stats.total_size | number | Total size in bytes |
| stats.languages | LanguageStats[] | Top 15 file extensions by size |

#### Excluded Directories

Overview automatically skips:
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`
- `build/`
- `__pycache__/`
- `.cache/`
- `coverage/`
- `.nyc_output/`

---

## Error Handling

### Error Codes

| Code | Description | Common Causes |
|------|-------------|---------------|
| `file_not_found` | File does not exist | Typo in path, deleted file |
| `directory_not_found` | Directory does not exist | Typo in path, deleted directory |
| `access_denied` | Path outside sandbox | Path traversal attempt, symlink escape |
| `file_too_large` | File exceeds size limit | Large generated files, binaries |
| `binary_file` | Binary file with UTF-8 encoding | Image, executable, archive |
| `invalid_pattern` | Malformed regex/glob | Unescaped special characters |
| `search_timeout` | Search exceeded time limit | Large repository, complex pattern |
| `invalid_arguments` | Invalid tool parameters | Missing required params, wrong types |
| `internal_error` | Unexpected server error | Bug, permission issues |

### Error Response Format

```json
{
  "code": -32001,
  "message": "File not found: src/missing.ts",
  "data": {
    "error_code": "file_not_found",
    "path": "src/missing.ts"
  }
}
```

### JSON-RPC Error Code Mapping

| MCP Error Code | JSON-RPC Code |
|----------------|---------------|
| `file_not_found` | -32001 |
| `directory_not_found` | -32001 |
| `access_denied` | -32002 |
| `file_too_large` | -32003 |
| `binary_file` | -32004 |
| `invalid_pattern` | -32005 |
| `search_timeout` | -32006 |
| `invalid_arguments` | -32602 |
| `internal_error` | -32603 |

---

## Examples

### Complete Workflow: Understanding a Codebase

```javascript
// 1. Get repository overview
await callTool('get_repo_overview', {
  max_depth: 3,
  include_stats: true
});

// 2. List files in a specific directory
await callTool('list_files', {
  directory: 'src',
  pattern: '*.ts',
  max_depth: 5
});

// 3. Search for patterns
await callTool('search_files', {
  pattern: 'TODO|FIXME',
  is_regex: true,
  glob: 'src/**/*'
});

// 4. Read specific files
await callTool('read_file', {
  path: 'src/index.ts'
});
```

### Finding Authentication Code

```javascript
// Search for auth-related patterns
const authResults = await callTool('search_files', {
  pattern: 'authenticate|login|token|session',
  is_regex: true,
  glob: '**/*.ts',
  context_lines: 3
});

// Read each file containing auth code
for (const match of authResults.matches) {
  const content = await callTool('read_file', {
    path: match.path
  });
  // Analyze the file...
}
```

### Exploring Project Structure

```javascript
// Get high-level overview
const overview = await callTool('get_repo_overview', {
  max_depth: 2
});

console.log(`Project: ${overview.root}`);
console.log(`Files: ${overview.stats.total_files}`);
console.log(`Languages:`);
for (const lang of overview.stats.languages) {
  console.log(`  ${lang.extension}: ${lang.count} files`);
}
```

---

*Last updated: January 11, 2026*
