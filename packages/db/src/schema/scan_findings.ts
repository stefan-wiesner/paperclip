import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";
import { vulnerabilityScans } from "./vulnerability_scans.js";
import { vulnerabilities } from "./vulnerabilities.js";

export const scanFindings = pgTable(
  "scan_findings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id").notNull().references(() => vulnerabilityScans.id),
    vulnerabilityId: uuid("vulnerability_id").notNull().references(() => vulnerabilities.id),
    llmRawOutput: text("llm_raw_output"),
    processingTimeMs: integer("processing_time_ms"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type ScanFinding = typeof scanFindings.$inferSelect;
export type NewScanFinding = typeof scanFindings.$inferInsert;
