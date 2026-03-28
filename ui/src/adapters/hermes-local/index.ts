import type { UIAdapterModule } from "../types";
import type { CreateConfigValues } from "@paperclipai/adapter-utils";
import { HermesLocalConfigFields } from "./config-fields";

// Note: hermes-paperclip-adapter does not export UI utilities
const parseHermesStdoutLine = (line: string) => [{ kind: "stdout" as const, ts: new Date().toISOString(), text: line }];
const buildHermesConfig = (_values: CreateConfigValues): Record<string, unknown> => ({});

export const hermesLocalUIAdapter: UIAdapterModule = {
  type: "hermes_local",
  label: "Hermes Agent",
  parseStdoutLine: parseHermesStdoutLine,
  ConfigFields: HermesLocalConfigFields,
  buildAdapterConfig: buildHermesConfig,
};
