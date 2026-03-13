import { describe, expect, it } from "vitest";
import {
  buildJoinDefaultsPayloadForAccept,
  normalizeAgentDefaultsForJoin,
} from "../routes/access.js";

describe("buildJoinDefaultsPayloadForAccept (openclaw_gateway)", () => {
  it("leaves non-gateway payloads unchanged", () => {
    const defaultsPayload = { command: "echo hello" };
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "process",
      defaultsPayload,
      inboundOpenClawAuthHeader: "ignored-token",
    });

    expect(result).toEqual(defaultsPayload);
  });

  it("normalizes wrapped x-openclaw-token header", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "openclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:18789",
        headers: {
          "x-openclaw-token": {
            value: "gateway-token-1234567890",
          },
        },
      },
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      url: "ws://127.0.0.1:18789",
      headers: {
        "x-openclaw-token": "gateway-token-1234567890",
      },
    });
  });

  it("accepts inbound x-openclaw-token for gateway joins", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "openclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:18789",
      },
      inboundOpenClawTokenHeader: "gateway-token-1234567890",
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      headers: {
        "x-openclaw-token": "gateway-token-1234567890",
      },
    });
  });

  it("derives x-openclaw-token from authorization header", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "openclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:18789",
        headers: {
          authorization: "Bearer gateway-token-1234567890",
        },
      },
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      headers: {
        authorization: "Bearer gateway-token-1234567890",
        "x-openclaw-token": "gateway-token-1234567890",
      },
    });
  });
});

describe("buildJoinDefaultsPayloadForAccept (ironclaw_gateway)", () => {
  it("returns payload unchanged when authToken already present", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:3200/api/gateway/ws",
        authToken: "ironclaw-token-1234567890",
      },
      inboundOpenClawTokenHeader: "should-be-ignored",
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      url: "ws://127.0.0.1:3200/api/gateway/ws",
      authToken: "ironclaw-token-1234567890",
    });
    expect((result as Record<string, unknown>).authToken).toBe("ironclaw-token-1234567890");
  });

  it("derives authToken from inbound x-openclaw-token header when not in payload", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:3200/api/gateway/ws",
      },
      inboundOpenClawTokenHeader: "inbound-gateway-token-1234567890",
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      authToken: "inbound-gateway-token-1234567890",
    });
  });

  it("falls back to inbound x-openclaw-auth header for authToken", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:3200/api/gateway/ws",
      },
      inboundOpenClawAuthHeader: "auth-header-token-1234567890",
    }) as Record<string, unknown>;

    expect(result).toMatchObject({
      authToken: "auth-header-token-1234567890",
    });
  });

  it("returns null for empty ironclaw_gateway payload with no inbound token", () => {
    const result = buildJoinDefaultsPayloadForAccept({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {},
    });

    expect(result).toBeNull();
  });
});

describe("normalizeAgentDefaultsForJoin (ironclaw_gateway)", () => {
  it("normalizes url and authToken successfully", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:3200/api/gateway/ws",
        authToken: "ironclaw-secret-token-1234567890",
        disableDeviceAuth: true,
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors).toEqual([]);
    expect(result.normalized?.url).toBe("ws://127.0.0.1:3200/api/gateway/ws");
    expect(result.normalized?.authToken).toBe("ironclaw-secret-token-1234567890");
    expect(result.normalized?.disableDeviceAuth).toBe(true);
  });

  it("reports missing authToken as a fatal error", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:3200/api/gateway/ws",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors.length).toBeGreaterThan(0);
    expect(result.fatalErrors.join(" ")).toContain("authToken");
    expect(result.diagnostics.some((d) => d.code === "ironclaw_gateway_auth_token_missing")).toBe(true);
  });

  it("reports missing url as a fatal error", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        authToken: "ironclaw-secret-token-1234567890",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.code === "ironclaw_gateway_url_missing")).toBe(true);
  });

  it("rejects http:// url as a fatal error", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "http://127.0.0.1:3200/api/gateway/ws",
        authToken: "ironclaw-secret-token-1234567890",
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.code === "ironclaw_gateway_url_protocol")).toBe(true);
  });

  it("reports missing defaults as a fatal error", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: null,
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors.length).toBeGreaterThan(0);
    expect(result.diagnostics.some((d) => d.code === "ironclaw_gateway_defaults_missing")).toBe(true);
  });

  it("normalizes optional fields (waitTimeoutMs, sessionKeyStrategy, role, scopes)", () => {
    const result = normalizeAgentDefaultsForJoin({
      adapterType: "ironclaw_gateway",
      defaultsPayload: {
        url: "wss://gateway.example/api/gateway/ws",
        authToken: "ironclaw-secret-token-1234567890",
        waitTimeoutMs: 120000,
        timeoutSec: 60,
        sessionKeyStrategy: "fixed",
        sessionKey: "paperclip",
        role: "operator",
        scopes: ["operator.admin"],
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(result.fatalErrors).toEqual([]);
    expect(result.normalized?.waitTimeoutMs).toBe(120000);
    expect(result.normalized?.timeoutSec).toBe(60);
    expect(result.normalized?.sessionKeyStrategy).toBe("fixed");
    expect(result.normalized?.sessionKey).toBe("paperclip");
    expect(result.normalized?.role).toBe("operator");
    expect(result.normalized?.scopes).toEqual(["operator.admin"]);
  });
});

describe("normalizeAgentDefaultsForJoin (openclaw_gateway)", () => {
  it("generates persistent device key when device auth is enabled", () => {
    const normalized = normalizeAgentDefaultsForJoin({
      adapterType: "openclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:18789",
        headers: {
          "x-openclaw-token": "gateway-token-1234567890",
        },
        disableDeviceAuth: false,
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(normalized.fatalErrors).toEqual([]);
    expect(normalized.normalized?.disableDeviceAuth).toBe(false);
    expect(typeof normalized.normalized?.devicePrivateKeyPem).toBe("string");
    expect((normalized.normalized?.devicePrivateKeyPem as string).length).toBeGreaterThan(64);
  });

  it("does not generate device key when disableDeviceAuth=true", () => {
    const normalized = normalizeAgentDefaultsForJoin({
      adapterType: "openclaw_gateway",
      defaultsPayload: {
        url: "ws://127.0.0.1:18789",
        headers: {
          "x-openclaw-token": "gateway-token-1234567890",
        },
        disableDeviceAuth: true,
      },
      deploymentMode: "authenticated",
      deploymentExposure: "private",
      bindHost: "127.0.0.1",
      allowedHostnames: [],
    });

    expect(normalized.fatalErrors).toEqual([]);
    expect(normalized.normalized?.disableDeviceAuth).toBe(true);
    expect(normalized.normalized?.devicePrivateKeyPem).toBeUndefined();
  });
});
