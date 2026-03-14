import { afterEach, describe, expect, it } from "vitest";
import { WebSocketServer } from "ws";
import { execute, testEnvironment } from "@paperclipai/adapter-ironclaw-gateway/server";
import {
  buildIronClawGatewayConfig,
  parseIronClawGatewayStdoutLine,
} from "@paperclipai/adapter-ironclaw-gateway/ui";
import type { AdapterExecutionContext } from "@paperclipai/adapter-utils";

function buildContext(
  config: Record<string, unknown>,
  overrides?: Partial<AdapterExecutionContext>,
): AdapterExecutionContext {
  return {
    runId: "run-123",
    agent: {
      id: "agent-123",
      companyId: "company-123",
      name: "IronClaw Gateway Agent",
      adapterType: "ironclaw_gateway",
      adapterConfig: {},
    },
    runtime: {
      sessionId: null,
      sessionParams: null,
      sessionDisplayId: null,
      taskKey: null,
    },
    config,
    context: {
      taskId: "task-123",
      issueId: "issue-123",
      wakeReason: "issue_assigned",
      issueIds: ["issue-123"],
    },
    onLog: async () => {},
    ...overrides,
  };
}

function buildFixtureAuthValue(): string {
  return ["fixture", "auth", "value"].join("-");
}

async function createMockGatewayServer() {
  const wss = new WebSocketServer({ host: "127.0.0.1", port: 0 });

  let agentPayload: Record<string, unknown> | null = null;

  wss.on("connection", (socket) => {
    socket.send(
      JSON.stringify({
        type: "event",
        event: "connect.challenge",
        payload: { nonce: "nonce-123" },
      }),
    );

    socket.on("message", (raw) => {
      const text = Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw);
      const frame = JSON.parse(text) as {
        type: string;
        id: string;
        method: string;
        params?: Record<string, unknown>;
      };

      if (frame.type !== "req") return;

      if (frame.method === "connect") {
        socket.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok: true,
            payload: {
              protocol: 3,
              server: { version: "test", connId: "conn-1" },
            },
          }),
        );
        return;
      }

      if (frame.method === "agent") {
        agentPayload = frame.params ?? null;
        const runId = typeof frame.params?.idempotencyKey === "string" ? frame.params.idempotencyKey : "run-123";
        socket.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok: true,
            payload: {
              runId,
              status: "accepted",
              acceptedAt: Date.now(),
              meta: {
                provider: "ironclaw",
              },
            },
          }),
        );
        socket.send(
          JSON.stringify({
            type: "event",
            event: "agent",
            payload: {
              runId,
              seq: 1,
              stream: "assistant",
              ts: Date.now(),
              data: { delta: "hello" },
            },
          }),
        );
        return;
      }

      if (frame.method === "agent.wait") {
        socket.send(
          JSON.stringify({
            type: "res",
            id: frame.id,
            ok: true,
            payload: {
              runId: frame.params?.runId,
              status: "ok",
              startedAt: 1,
              endedAt: 2,
              meta: {
                provider: "ironclaw",
              },
            },
          }),
        );
      }
    });
  });

  await new Promise<void>((resolve) => {
    wss.once("listening", () => resolve());
  });

  const address = wss.address();
  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve test server address");
  }

  return {
    url: `ws://127.0.0.1:${address.port}`,
    getAgentPayload: () => agentPayload,
    close: async () => {
      await new Promise<void>((resolve) => wss.close(() => resolve()));
    },
  };
}

afterEach(() => {
  return undefined;
});

describe("ironclaw gateway ui", () => {
  it("builds ironclaw gateway config", () => {
    expect(
      buildIronClawGatewayConfig({
        adapterType: "ironclaw_gateway",
        cwd: "",
        promptTemplate: "",
        model: "",
        thinkingEffort: "",
        chrome: false,
        dangerouslySkipPermissions: false,
        search: false,
        dangerouslyBypassSandbox: false,
        command: "",
        args: "",
        extraArgs: "",
        envVars: "",
        envBindings: {},
        url: "wss://gateway.example/ws",
        bootstrapPrompt: "",
        maxTurnsPerRun: 0,
        heartbeatEnabled: true,
        intervalSec: 300,
      }),
    ).toEqual(
      expect.objectContaining({
        url: "wss://gateway.example/ws",
        role: "operator",
      }),
    );
  });

  it("parses ironclaw event lines", () => {
    expect(
      parseIronClawGatewayStdoutLine(
        '[ironclaw-gateway:event] run=run-1 stream=assistant data={"delta":"hello"}',
        "2026-03-12T18:00:00.000Z",
      ),
    ).toEqual([
      {
        kind: "assistant",
        ts: "2026-03-12T18:00:00.000Z",
        text: "hello",
        delta: true,
      },
    ]);
  });
});

describe("ironclaw gateway adapter execute", () => {
  it("runs connect -> agent -> agent.wait with ironclaw defaults", async () => {
    const gateway = await createMockGatewayServer();
    const logs: string[] = [];

    try {
      const result = await execute(
        buildContext(
          {
            url: gateway.url,
            authToken: buildFixtureAuthValue(),
            waitTimeoutMs: 2000,
          },
          {
            onLog: async (_stream, chunk) => {
              logs.push(chunk);
            },
          },
        ),
      );

      expect(result.exitCode).toBe(0);
      expect(result.provider).toBe("ironclaw");
      expect(result.summary).toContain("hello");
      expect(gateway.getAgentPayload()).toBeTruthy();
      expect(gateway.getAgentPayload()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Read the JSON file directly from the filesystem"),
        }),
      );
      expect(gateway.getAgentPayload()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Do not use memory tools, memory search, or knowledge-base lookup"),
        }),
      );
      expect(gateway.getAgentPayload()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("Set PAPERCLIP_API_KEY to the token field from that JSON file."),
        }),
      );
      expect(gateway.getAgentPayload()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("/.ironclaw/workspace/paperclip-claimed-api-key.json"),
        }),
      );
      expect(logs.some((entry) => entry.includes("[ironclaw-gateway:event] run=run-123 stream=assistant"))).toBe(true);
    } finally {
      await gateway.close();
    }
  });

  it("prefers configured paperclip api key path in wake instructions", async () => {
    const gateway = await createMockGatewayServer();

    try {
      const result = await execute(
        buildContext({
          url: gateway.url,
          authToken: buildFixtureAuthValue(),
          waitTimeoutMs: 2000,
          paperclipApiKeyPath: "/tmp/aistack/.aistack/ironclaw/workspace/paperclip-claimed-api-key.json",
        }),
      );

      expect(result.exitCode).toBe(0);
      expect(gateway.getAgentPayload()).toEqual(
        expect.objectContaining({
          message: expect.stringContaining("/tmp/aistack/.aistack/ironclaw/workspace/paperclip-claimed-api-key.json"),
        }),
      );
    } finally {
      await gateway.close();
    }
  });
});

describe("ironclaw gateway testEnvironment", () => {
  it("reports missing url as failure", async () => {
    const result = await testEnvironment({
      companyId: "company-123",
      adapterType: "ironclaw_gateway",
      config: {},
    });

    expect(result.status).toBe("fail");
    expect(result.checks.some((check) => check.code === "ironclaw_gateway_url_missing")).toBe(true);
  });
});
