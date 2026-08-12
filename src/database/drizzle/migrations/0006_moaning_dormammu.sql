ALTER TABLE "service_options" ADD COLUMN IF NOT EXISTS "name" text;--> statement-breakpoint
UPDATE "service_options" SET "name" = "duration_minutes" || ' min' WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "service_options" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "appointments" ADD COLUMN IF NOT EXISTS "service_option_name" text;--> statement-breakpoint
UPDATE "appointments" a SET "service_option_name" = o."name" FROM "service_options" o WHERE o."id" = a."service_option_id" AND a."service_option_name" IS NULL;--> statement-breakpoint
UPDATE "appointments" SET "service_option_name" = "duration_minutes" || ' min' WHERE "service_option_name" IS NULL;--> statement-breakpoint
ALTER TABLE "appointments" ALTER COLUMN "service_option_name" SET NOT NULL;
