import type { TranscriptEntry } from "@paperclipai/adapter-utils";
import { normalizeIronClawGatewayStreamLine } from "../shared/stream.js";

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isGatewayEventLine(line: string): boolean {
  return line.startsWith("[ironclaw-gateway:event]") || line.startsWith("[openclaw-gateway:event]");
}

function isGatewaySystemLine(line: string): boolean {
  return line.startsWith("[ironclaw-gateway]") || line.startsWith("[openclaw-gateway]");
}

function parseAgentEventLine(line: string, ts: string): TranscriptEntry[] {
  const match = line.match(/^\[(?:ironclaw|openclaw)-gateway:event\]\s+run=([^\s]+)\s+stream=([^\s]+)\s+data=(.*)$/s);
  if (!match) return [{ kind: "stdout", ts, text: line }];

  const stream = asString(match[2]).toLowerCase();
  const data = asRecord(safeJsonParse(asString(match[3]).trim()));

  if (stream === "assistant") {
    const delta = asString(data?.delta);
    if (delta.length > 0) {
      return [{ kind: "assistant", ts, text: delta, delta: true }];
    }

    const text = asString(data?.text);
    if (text.length > 0) {
      return [{ kind: "assistant", ts, text }];
    }
    return [];
  }

  if (stream === "error") {
    const message = asString(data?.error) || asString(data?.message);
    return message ? [{ kind: "stderr", ts, text: message }] : [];
  }

  if (stream === "lifecycle") {
    const phase = asString(data?.phase).toLowerCase();
    const message = asString(data?.error) || asString(data?.message);
    if ((phase === "error" || phase === "failed" || phase === "cancelled") && message) {
      return [{ kind: "stderr", ts, text: message }];
    }
  }

  return [];
}

export function parseIronClawGatewayStdoutLine(line: string, ts: string): TranscriptEntry[] {
  const normalized = normalizeIronClawGatewayStreamLine(line);
  if (normalized.stream === "stderr") {
    return [{ kind: "stderr", ts, text: normalized.line }];
  }

  const trimmed = normalized.line.trim();
  if (!trimmed) return [];

  if (isGatewayEventLine(trimmed)) {
    return parseAgentEventLine(trimmed, ts);
  }

  if (isGatewaySystemLine(trimmed)) {
    return [{ kind: "system", ts, text: trimmed.replace(/^\[(?:ironclaw|openclaw)-gateway\]\s*/, "") }];
  }

  return [{ kind: "stdout", ts, text: normalized.line }];
}

export const parseOpenClawGatewayStdoutLine = parseIronClawGatewayStdoutLine;
