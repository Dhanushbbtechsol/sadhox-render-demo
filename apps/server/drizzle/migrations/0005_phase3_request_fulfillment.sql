ALTER TABLE "service_requests" ADD COLUMN "assignee_id" uuid;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "fulfillment_notes" text;--> statement-breakpoint
ALTER TABLE "service_requests" ADD COLUMN "fulfilled_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "service_requests" ADD CONSTRAINT "service_requests_assignee_id_users_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
