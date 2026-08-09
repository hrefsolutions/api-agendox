ALTER TYPE "public"."subscription_status" ADD VALUE 'PENDING' BEFORE 'ACTIVE';--> statement-breakpoint
CREATE TABLE "super_admins" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"last_login_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "payment_settings" ADD COLUMN "deposit_ttl_hours" integer;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN "idempotency_key" uuid;--> statement-breakpoint
ALTER TABLE "deposits" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
CREATE UNIQUE INDEX "super_admins_email_uq" ON "super_admins" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "appointments_idempotency_uq" ON "appointments" USING btree ("organization_id","idempotency_key") WHERE "appointments"."idempotency_key" IS NOT NULL;