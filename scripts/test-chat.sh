#!/bin/bash
# Test chat endpoint with tool calling

curl -s -X POST "http://localhost:3000/api/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "What files are in the root of this project?"}],
    "model": "llama3.2:3b",
    "repo_path": "/Users/harshh/Documents/GitHub/engineering-assistant",
    "stream": false,
    "tool_mode": "auto"
  }' | jq '.'
