export const type = "nemoclaw_gateway";
export const label = "NemoClaw Gateway";

export const models: { id: string; label: string }[] = [
  { id: "nvidia/nemotron-4-340b-instruct", label: "Nemotron 4 340B Instruct" },
  { id: "nvidia/nemotron-4-22b-instruct", label: "Nemotron 4 22B Instruct" },
  { id: "nvidia/nemotron-cc-10b", label: "Nemotron CC 10B" },
];

export const agentConfigurationDoc = `# nemoclaw_gateway agent configuration

Adapter: nemoclaw_gateway

Use when:
- You want Paperclip to invoke NemoClaw over the Gateway WebSocket protocol.
- You want GPU-accelerated AI agents with NVIDIA NeMo integration.
- You need enterprise-grade security with NVIDIA OpenShell guardrails.

Don't use when:
- You only expose HTTP endpoints.
- Your deployment does not permit outbound WebSocket access from the Paperclip server.
- You need CPU-only deployment (use IronClaw instead).

Core fields:
- url (string, required): NemoClaw gateway WebSocket URL (use the ws or wss scheme)
- headers (object, optional): handshake headers; supports x-nemoclaw-token / authorization
- authToken (string, optional): shared gateway token override

Gateway connect identity fields:
- clientId (string, optional): gateway client id (default paperclip-nemoclaw)
- clientMode (string, optional): gateway client mode (default backend)
- role (string, optional): gateway role (default operator)
- scopes (string[] | comma string, optional): gateway scopes (default ["operator.admin"])

Request behavior fields:
- payloadTemplate (object, optional): additional fields merged into gateway agent params
- timeoutSec (number, optional): adapter timeout in seconds (default 120)
- waitTimeoutMs (number, optional): agent.wait timeout override (default timeoutSec * 1000)
- paperclipApiUrl (string, optional): absolute Paperclip base URL advertised in wake text

LLM configuration fields:
- llmProvider (string, optional): LLM provider (nvidia, openai, anthropic, ollama)
- llmModel (string, optional): LLM model identifier
- temperature (number, optional): LLM temperature (default 0.7)

Memory configuration fields:
- memoryBackend (string, optional): Memory backend (postgres, sqlite, milvus)
- embeddingModel (string, optional): Embedding model for vector search

Session routing fields:
- sessionKeyStrategy (string, optional): issue (default), fixed, or run
- sessionKey (string, optional): fixed session key when strategy=fixed (default paperclip)
`;
