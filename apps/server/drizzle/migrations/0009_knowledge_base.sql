-- Phase 5 Day 21 — Knowledge Base tables.
-- Idempotent: TL remote already had these objects from an orphan journal apply.
DO $$ BEGIN
 CREATE TYPE "public"."knowledge_article_status" AS ENUM('Draft', 'Published');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."knowledge_ticket_type" AS ENUM('incident', 'service_request', 'problem');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_categories_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "knowledge_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"status" "knowledge_article_status" DEFAULT 'Draft' NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_articles_slug_unique" UNIQUE("slug")
);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "ticket_knowledge_links" (
	"ticket_id" uuid NOT NULL,
	"ticket_type" "knowledge_ticket_type" NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_knowledge_links_ticket_id_ticket_type_article_id_pk" PRIMARY KEY("ticket_id","ticket_type","article_id")
);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "ticket_knowledge_links" ADD CONSTRAINT "ticket_knowledge_links_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_articles_category_id_idx" ON "knowledge_articles" USING btree ("category_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "knowledge_articles_status_idx" ON "knowledge_articles" USING btree ("status");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "ticket_knowledge_links_article_id_idx" ON "ticket_knowledge_links" USING btree ("article_id");
