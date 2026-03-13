import pc from "picocolors";

export function printIronClawGatewayStreamEvent(raw: string, debug: boolean): void {
  const line = raw.trim();
  if (!line) return;

  if (!debug) {
    console.log(line);
    return;
  }

  if (line.startsWith("[ironclaw-gateway:event]")) {
    console.log(pc.cyan(line));
    return;
  }

  if (line.startsWith("[ironclaw-gateway]")) {
    console.log(pc.blue(line));
    return;
  }

  console.log(pc.gray(line));
}

export const printOpenClawGatewayStreamEvent = printIronClawGatewayStreamEvent;
