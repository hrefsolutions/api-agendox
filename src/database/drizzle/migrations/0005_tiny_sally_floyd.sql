CREATE TABLE "terms_acceptances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"version" varchar(32) NOT NULL,
	"accepted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_address" varchar(64),
	"user_agent" text
);
--> statement-breakpoint
CREATE UNIQUE INDEX "terms_acceptances_org_version_uq" ON "terms_acceptances" USING btree ("organization_id","version");--> statement-breakpoint
CREATE INDEX "terms_acceptances_org_accepted_at_idx" ON "terms_acceptances" USING btree ("organization_id","accepted_at");