import { pgTable, uuid, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";
import { vulnerabilityScans } from "./vulnerability_scans.js";

export const vulnerabilities = pgTable(
  "vulnerabilities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    scanId: uuid("scan_id").notNull().references(() => vulnerabilityScans.id),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    severity: text("severity").notNull().default("medium"),
    cweId: text("cwe_id"),
    title: text("title").notNull(),
    description: text("description"),
    filePath: text("file_path").notNull(),
    lineNumber: integer("line_number"),
    codeSnippet: text("code_snippet"),
    confidenceScore: integer("confidence_score").default(0),
    status: text("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    scanIdIdx: index("vulnerabilities_scan_id_idx").on(table.scanId),
    companyIdIdx: index("vulnerabilities_company_id_idx").on(table.companyId),
    severityIdx: index("vulnerabilities_severity_idx").on(table.severity),
    statusIdx: index("vulnerabilities_status_idx").on(table.status),
  }),
);

export type Vulnerability = typeof vulnerabilities.$inferSelect;
export type NewVulnerability = typeof vulnerabilities.$inferInsert;
