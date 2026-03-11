import type { UIAdapterModule } from "../types";
import { parseIronClawGatewayStdoutLine } from "@paperclipai/adapter-ironclaw-gateway/ui";
import { buildIronClawGatewayConfig } from "@paperclipai/adapter-ironclaw-gateway/ui";
import { OpenClawGatewayConfigFields } from "../openclaw-gateway/config-fields";

export const ironClawGatewayUIAdapter: UIAdapterModule = {
  type: "ironclaw_gateway",
  label: "IronClaw Gateway",
  parseStdoutLine: parseIronClawGatewayStdoutLine,
  ConfigFields: OpenClawGatewayConfigFields,
  buildAdapterConfig: buildIronClawGatewayConfig,
};
