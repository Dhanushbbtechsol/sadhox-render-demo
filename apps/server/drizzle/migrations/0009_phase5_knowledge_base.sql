CREATE TYPE "public"."knowledge_article_status" AS ENUM('Draft', 'Published');
--> statement-breakpoint
CREATE TABLE "knowledge_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"description" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_categories_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "knowledge_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" varchar(255) NOT NULL,
	"slug" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"status" "knowledge_article_status" DEFAULT 'Draft' NOT NULL,
	"category_id" uuid NOT NULL,
	"author_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_articles_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "ticket_knowledge_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ticket_id" uuid NOT NULL,
	"ticket_type" "ticket_type" NOT NULL,
	"article_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ticket_knowledge_links_unique" UNIQUE("ticket_id","ticket_type","article_id")
);
--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_category_id_knowledge_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."knowledge_categories"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "knowledge_articles" ADD CONSTRAINT "knowledge_articles_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "ticket_knowledge_links" ADD CONSTRAINT "ticket_knowledge_links_article_id_knowledge_articles_id_fk" FOREIGN KEY ("article_id") REFERENCES "public"."knowledge_articles"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "knowledge_categories_slug_idx" ON "knowledge_categories" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "knowledge_articles_category_id_idx" ON "knowledge_articles" USING btree ("category_id");
--> statement-breakpoint
CREATE INDEX "knowledge_articles_status_idx" ON "knowledge_articles" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "knowledge_articles_slug_idx" ON "knowledge_articles" USING btree ("slug");
--> statement-breakpoint
CREATE INDEX "ticket_knowledge_links_ticket_idx" ON "ticket_knowledge_links" USING btree ("ticket_type","ticket_id");
--> statement-breakpoint
CREATE INDEX "ticket_knowledge_links_article_id_idx" ON "ticket_knowledge_links" USING btree ("article_id");
