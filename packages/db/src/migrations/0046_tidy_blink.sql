CREATE TABLE "github_webhooks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"repo_owner" text NOT NULL,
	"repo_name" text NOT NULL,
	"webhook_id" text NOT NULL,
	"webhook_secret" text NOT NULL,
	"branch_filter" text DEFAULT 'main',
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scan_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"vulnerability_id" uuid NOT NULL,
	"llm_raw_output" text,
	"processing_time_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vulnerabilities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"company_id" uuid NOT NULL,
	"severity" text DEFAULT 'medium' NOT NULL,
	"cwe_id" text,
	"title" text NOT NULL,
	"description" text,
	"file_path" text NOT NULL,
	"line_number" integer,
	"code_snippet" text,
	"confidence_score" integer DEFAULT 0,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vulnerability_scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"project_id" uuid,
	"repo_url" text NOT NULL,
	"branch" text DEFAULT 'main' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"total_files" integer DEFAULT 0,
	"findings_count" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_webhooks" ADD CONSTRAINT "github_webhooks_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_scan_id_vulnerability_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."vulnerability_scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scan_findings" ADD CONSTRAINT "scan_findings_vulnerability_id_vulnerabilities_id_fk" FOREIGN KEY ("vulnerability_id") REFERENCES "public"."vulnerabilities"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_scan_id_vulnerability_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "public"."vulnerability_scans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerabilities" ADD CONSTRAINT "vulnerabilities_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerability_scans" ADD CONSTRAINT "vulnerability_scans_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vulnerability_scans" ADD CONSTRAINT "vulnerability_scans_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "github_webhooks_company_id_idx" ON "github_webhooks" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "github_webhooks_repo_idx" ON "github_webhooks" USING btree ("repo_owner","repo_name");--> statement-breakpoint
CREATE INDEX "vulnerabilities_scan_id_idx" ON "vulnerabilities" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "vulnerabilities_company_id_idx" ON "vulnerabilities" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "vulnerabilities_severity_idx" ON "vulnerabilities" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "vulnerabilities_status_idx" ON "vulnerabilities" USING btree ("status");--> statement-breakpoint
CREATE INDEX "vulnerability_scans_company_id_idx" ON "vulnerability_scans" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "vulnerability_scans_project_id_idx" ON "vulnerability_scans" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "vulnerability_scans_status_idx" ON "vulnerability_scans" USING btree ("status");