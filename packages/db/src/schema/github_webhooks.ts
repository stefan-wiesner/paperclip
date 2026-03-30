import { pgTable, uuid, text, timestamp, boolean, index } from "drizzle-orm/pg-core";
import { companies } from "./companies.js";

export const githubWebhooks = pgTable(
  "github_webhooks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    repoOwner: text("repo_owner").notNull(),
    repoName: text("repo_name").notNull(),
    webhookId: text("webhook_id").notNull(),
    webhookSecret: text("webhook_secret").notNull(),
    branchFilter: text("branch_filter").default("main"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdIdx: index("github_webhooks_company_id_idx").on(table.companyId),
    repoIdx: index("github_webhooks_repo_idx").on(table.repoOwner, table.repoName),
  }),
);

export type GithubWebhook = typeof githubWebhooks.$inferSelect;
export type NewGithubWebhook = typeof githubWebhooks.$inferInsert;
