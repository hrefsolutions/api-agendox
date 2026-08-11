CREATE TABLE "organization_features" (
	"organization_id" uuid PRIMARY KEY NOT NULL,
	"whatsapp_notifications" boolean DEFAULT false NOT NULL,
	"logo_upload" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
