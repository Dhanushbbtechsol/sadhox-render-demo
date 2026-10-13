CREATE TABLE IF NOT EXISTS "incident_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(64) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "incident_categories_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "incident_subcategories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"min_priority" "priority_level",
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "incident_subcategories" ADD CONSTRAINT "incident_subcategories_category_id_incident_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."incident_categories"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "incident_subcategories_category_name_unique" ON "incident_subcategories" USING btree ("category_id","name");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_categories_active_idx" ON "incident_categories" USING btree ("is_active");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "incident_subcategories_category_id_idx" ON "incident_subcategories" USING btree ("category_id");
