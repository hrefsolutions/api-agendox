CREATE TYPE "public"."deposit_type" AS ENUM('FIXED', 'PERCENTAGE');--> statement-breakpoint
CREATE TYPE "public"."client_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."blocked_time_type" AS ENUM('VACATION', 'LICENSE', 'MAINTENANCE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."appointment_source" AS ENUM('PUBLIC', 'INTERNAL');--> statement-breakpoint
CREATE TYPE "public"."appointment_status" AS ENUM('PENDING_DEPOSIT', 'PENDING_APPROVAL', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REJECTED', 'NO_SHOW');--> statement-breakpoint
CREATE TYPE "public"."deposit_status" AS ENUM('PENDING', 'CONFIRMED', 'REJECTED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."notification_recipient_type" AS ENUM('STAFF_USER', 'CLIENT');--> statement-breakpoint
CREATE TYPE "public"."plan_status" AS ENUM('ACTIVE', 'INACTIVE');--> statement-breakpoint
CREATE TYPE "public"."subscription_status" AS ENUM('ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TABLE "booking_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"public_booking_enabled" boolean DEFAULT true NOT NULL,
	"slot_granularity_minutes" integer DEFAULT 15 NOT NULL,
	"min_notice_minutes" integer DEFAULT 120 NOT NULL,
	"max_advance_days" integer DEFAULT 60 NOT NULL,
	"cancellation_policy" text,
	"requires_manual_approval" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "branding_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"logo_url" text,
	"primary_color" text,
	"secondary_color" text,
	"public_title" text,
	"public_description" text
);
--> statement-breakpoint
CREATE TABLE "business_hours" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"opens_at" time,
	"closes_at" time,
	"is_closed" boolean DEFAULT false NOT NULL,
	"valid_from" date,
	"valid_to" date
);
--> statement-breakpoint
CREATE TABLE "business_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"business_name" text NOT NULL,
	"timezone" text NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"address" text,
	"locale" text DEFAULT 'es-AR' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notification_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"email_enabled" boolean DEFAULT true NOT NULL,
	"whatsapp_enabled" boolean DEFAULT false NOT NULL,
	"reminders_enabled" boolean DEFAULT true NOT NULL,
	"reminder_hours_before" integer DEFAULT 24 NOT NULL,
	"templates" jsonb DEFAULT '{}'::jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payment_settings" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"deposit_enabled" boolean DEFAULT false NOT NULL,
	"deposit_type" "deposit_type",
	"deposit_value" numeric(12, 2),
	"bank_name" text,
	"account_holder" text,
	"alias" text,
	"cbu" text,
	"phone" text,
	"instructions" text
);
--> statement-breakpoint
CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text NOT NULL,
	"whatsapp" text NOT NULL,
	"phone" text,
	"notes" text,
	"status" "client_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "service_options_duration_positive" CHECK ("service_options"."duration_minutes" > 0),
	CONSTRAINT "service_options_price_non_negative" CHECK ("service_options"."price" >= 0)
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_times" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_id" uuid,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" text,
	"type" "blocked_time_type" NOT NULL,
	"created_by_user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "blocked_times_valid_range" CHECK ("blocked_times"."starts_at" < "blocked_times"."ends_at")
);
--> statement-breakpoint
CREATE TABLE "resource_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"day_of_week" smallint NOT NULL,
	"starts_at" time NOT NULL,
	"ends_at" time NOT NULL,
	"valid_from" date,
	"valid_to" date
);
--> statement-breakpoint
CREATE TABLE "resource_services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"resource_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"color" text,
	"active" boolean DEFAULT true NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"service_name" text NOT NULL,
	"service_option_id" uuid NOT NULL,
	"duration_minutes" integer NOT NULL,
	"service_price" numeric(12, 2) NOT NULL,
	"resource_id" uuid NOT NULL,
	"resource_name" text NOT NULL,
	"client_id" uuid NOT NULL,
	"client_name" text NOT NULL,
	"client_phone" text NOT NULL,
	"client_email" text NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"deposit_amount" numeric(12, 2) NOT NULL,
	"remaining_amount" numeric(12, 2) NOT NULL,
	"status" "appointment_status" NOT NULL,
	"source" "appointment_source" NOT NULL,
	"notes" text,
	"cancellation_reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "appointments_valid_range" CHECK ("appointments"."ends_at" > "appointments"."starts_at"),
	CONSTRAINT "appointments_duration_positive" CHECK ("appointments"."duration_minutes" > 0)
);
--> statement-breakpoint
CREATE TABLE "deposits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"appointment_id" uuid NOT NULL,
	"expected_amount" numeric(12, 2) NOT NULL,
	"received_amount" numeric(12, 2),
	"status" "deposit_status" DEFAULT 'PENDING' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"confirmed_at" timestamp with time zone,
	"confirmed_by" uuid,
	"notes" text
);
--> statement-breakpoint
CREATE TABLE "customer_otps" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"appointment_id" uuid,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"recipient_type" "notification_recipient_type" NOT NULL,
	"recipient_id" uuid NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"price" numeric(12, 2) NOT NULL,
	"currency" text DEFAULT 'ARS' NOT NULL,
	"billing_period" text NOT NULL,
	"features" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"limits" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" "plan_status" DEFAULT 'ACTIVE' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" "subscription_status" NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"current_period_start" timestamp with time zone NOT NULL,
	"current_period_end" timestamp with time zone NOT NULL,
	"cancelled_at" timestamp with time zone,
	"provider_subscription_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "business_hours_org_dow_idx" ON "business_hours" USING btree ("organization_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "clients_org_email_uq" ON "clients" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "clients_org_idx" ON "clients" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "service_options_org_service_active_idx" ON "service_options" USING btree ("organization_id","service_id","active");--> statement-breakpoint
CREATE UNIQUE INDEX "services_org_name_uq" ON "services" USING btree ("organization_id","name");--> statement-breakpoint
CREATE INDEX "services_org_active_idx" ON "services" USING btree ("organization_id","active");--> statement-breakpoint
CREATE INDEX "blocked_times_org_resource_starts_idx" ON "blocked_times" USING btree ("organization_id","resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "blocked_times_org_starts_idx" ON "blocked_times" USING btree ("organization_id","starts_at");--> statement-breakpoint
CREATE INDEX "resource_schedules_org_resource_dow_idx" ON "resource_schedules" USING btree ("organization_id","resource_id","day_of_week");--> statement-breakpoint
CREATE UNIQUE INDEX "resource_services_uq" ON "resource_services" USING btree ("organization_id","resource_id","service_id");--> statement-breakpoint
CREATE INDEX "resources_org_active_idx" ON "resources" USING btree ("organization_id","active");--> statement-breakpoint
CREATE INDEX "appointments_org_resource_starts_idx" ON "appointments" USING btree ("organization_id","resource_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_org_client_starts_idx" ON "appointments" USING btree ("organization_id","client_id","starts_at");--> statement-breakpoint
CREATE INDEX "appointments_org_status_starts_idx" ON "appointments" USING btree ("organization_id","status","starts_at");--> statement-breakpoint
CREATE INDEX "deposits_org_appointment_status_idx" ON "deposits" USING btree ("organization_id","appointment_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "deposits_one_active_per_appointment" ON "deposits" USING btree ("appointment_id") WHERE "deposits"."status" = 'PENDING';--> statement-breakpoint
CREATE INDEX "customer_otps_org_email_idx" ON "customer_otps" USING btree ("organization_id","email");--> statement-breakpoint
CREATE INDEX "notifications_recipient_idx" ON "notifications" USING btree ("organization_id","recipient_type","recipient_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "push_subscriptions_endpoint_uq" ON "push_subscriptions" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "push_subscriptions_recipient_idx" ON "push_subscriptions" USING btree ("organization_id","recipient_type","recipient_id");--> statement-breakpoint
CREATE UNIQUE INDEX "plans_name_uq" ON "plans" USING btree ("name");--> statement-breakpoint
CREATE INDEX "subscriptions_org_status_idx" ON "subscriptions" USING btree ("organization_id","status");