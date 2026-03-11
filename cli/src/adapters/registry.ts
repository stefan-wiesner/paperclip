import type { CLIAdapterModule } from "@paperclipai/adapter-utils";
import { printClaudeStreamEvent } from "@paperclipai/adapter-claude-local/cli";
import { printCodexStreamEvent } from "@paperclipai/adapter-codex-local/cli";
import { printCursorStreamEvent } from "@paperclipai/adapter-cursor-local/cli";
<<<<<<< HEAD
import { printGeminiStreamEvent } from "@paperclipai/adapter-gemini-local/cli";
=======
import { printIronClawGatewayStreamEvent } from "@paperclipai/adapter-ironclaw-gateway/cli";
>>>>>>> e1e5565 (feat(adapters): add ironclaw-gateway adapter for IronClaw runtime integration)
import { printOpenCodeStreamEvent } from "@paperclipai/adapter-opencode-local/cli";
import { printPiStreamEvent } from "@paperclipai/adapter-pi-local/cli";
import { printOpenClawGatewayStreamEvent } from "@paperclipai/adapter-openclaw-gateway/cli";
import { processCLIAdapter } from "./process/index.js";
import { httpCLIAdapter } from "./http/index.js";

const claudeLocalCLIAdapter: CLIAdapterModule = {
  type: "claude_local",
  formatStdoutEvent: printClaudeStreamEvent,
};

const codexLocalCLIAdapter: CLIAdapterModule = {
  type: "codex_local",
  formatStdoutEvent: printCodexStreamEvent,
};

const openCodeLocalCLIAdapter: CLIAdapterModule = {
  type: "opencode_local",
  formatStdoutEvent: printOpenCodeStreamEvent,
};

const piLocalCLIAdapter: CLIAdapterModule = {
  type: "pi_local",
  formatStdoutEvent: printPiStreamEvent,
};

const cursorLocalCLIAdapter: CLIAdapterModule = {
  type: "cursor",
  formatStdoutEvent: printCursorStreamEvent,
};

const geminiLocalCLIAdapter: CLIAdapterModule = {
  type: "gemini_local",
  formatStdoutEvent: printGeminiStreamEvent,
};

const openclawGatewayCLIAdapter: CLIAdapterModule = {
  type: "openclaw_gateway",
  formatStdoutEvent: printOpenClawGatewayStreamEvent,
};

const ironclawGatewayCLIAdapter: CLIAdapterModule = {
  type: "ironclaw_gateway",
  formatStdoutEvent: printIronClawGatewayStreamEvent,
};

const adaptersByType = new Map<string, CLIAdapterModule>(
  [
    claudeLocalCLIAdapter,
    codexLocalCLIAdapter,
    openCodeLocalCLIAdapter,
    piLocalCLIAdapter,
    cursorLocalCLIAdapter,
<<<<<<< HEAD
    geminiLocalCLIAdapter,
=======
    ironclawGatewayCLIAdapter,
>>>>>>> e1e5565 (feat(adapters): add ironclaw-gateway adapter for IronClaw runtime integration)
    openclawGatewayCLIAdapter,
    processCLIAdapter,
    httpCLIAdapter,
  ].map((a) => [a.type, a]),
);

export function getCLIAdapter(type: string): CLIAdapterModule {
  return adaptersByType.get(type) ?? processCLIAdapter;
}
