# NemoClaw Gateway Adapter

Adapter for connecting Paperclip to NemoClaw runtime via WebSocket gateway protocol.

## Usage

Configure an agent with `adapterType: "nemoclaw_gateway"` and set the following config:

```json
{
  "adapterType": "nemoclaw_gateway",
  "adapterConfig": {
    "url": "ws://localhost:3201",
    "authToken": "your-gateway-token"
  }
}
```

## Configuration Options

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `url` | string | Yes | - | WebSocket URL (ws:// or wss://) |
| `authToken` | string | No | - | Gateway authentication token |
| `headers` | object | No | {} | Additional WebSocket headers |
| `timeoutSec` | number | No | 120 | Execution timeout in seconds |
| `clientId` | string | No | paperclip-nemoclaw | Gateway client ID |
| `role` | string | No | operator | Gateway role |
| `scopes` | string[] | No | ["operator.admin"] | Gateway scopes |
| `llmProvider` | string | No | nvidia | LLM provider (nvidia, openai, anthropic, ollama) |
| `llmModel` | string | No | - | LLM model identifier |
| `temperature` | number | No | 0.7 | LLM temperature |
| `memoryBackend` | string | No | postgres | Memory backend |
| `embeddingModel` | string | No | - | Embedding model for vector search |

## Protocol

The adapter uses a simple WebSocket protocol:

1. Connect to gateway WebSocket
2. Send `connect` request with client info and auth
3. Send `agent.start` request with session key and wake text
4. Receive events (`agent.log`, etc.)
5. Receive final response with result

## See Also

- `NEMOCLAW.md` - NemoClaw development guide
- `DUAL_REPO.md` - Dual-repo workflow documentation
