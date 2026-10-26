CREATE TABLE "plan_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"weekday" integer NOT NULL,
	"slot" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"plan_meal_id" uuid,
	"name" text,
	"items" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "plan_meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slot" text DEFAULT 'dinner' NOT NULL,
	"items" jsonb NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "plan_entries" ADD CONSTRAINT "plan_entries_plan_meal_id_plan_meals_id_fk" FOREIGN KEY ("plan_meal_id") REFERENCES "public"."plan_meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "plan_entries_weekday_idx" ON "plan_entries" USING btree ("weekday");