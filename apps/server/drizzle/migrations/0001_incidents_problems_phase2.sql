ALTER TABLE "incidents" ADD COLUMN "category" varchar(64) DEFAULT 'Other' NOT NULL;--> statement-breakpoint
CREATE INDEX "incidents_reporter_id_idx" ON "incidents" USING btree ("reporter_id");--> statement-breakpoint
CREATE TABLE "problem_incidents" (
	"problem_id" uuid NOT NULL,
	"incident_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "problem_incidents_problem_id_incident_id_pk" PRIMARY KEY("problem_id","incident_id"),
	CONSTRAINT "problem_incidents_incident_unique" UNIQUE("incident_id")
);
--> statement-breakpoint
ALTER TABLE "problem_incidents" ADD CONSTRAINT "problem_incidents_problem_id_problems_id_fk" FOREIGN KEY ("problem_id") REFERENCES "public"."problems"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "problem_incidents" ADD CONSTRAINT "problem_incidents_incident_id_incidents_id_fk" FOREIGN KEY ("incident_id") REFERENCES "public"."incidents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "problem_incidents_problem_id_idx" ON "problem_incidents" USING btree ("problem_id");
