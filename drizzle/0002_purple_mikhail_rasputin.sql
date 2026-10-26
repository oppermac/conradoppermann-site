CREATE TABLE "foods" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"brand" text,
	"basis" text DEFAULT 'per100g' NOT NULL,
	"unit_label" text,
	"unit_grams" real,
	"kcal" real NOT NULL,
	"protein_g" real NOT NULL,
	"carbs_g" real NOT NULL,
	"fat_g" real NOT NULL,
	"fibre_g" real,
	"default_qty" real,
	"source" text DEFAULT 'estimate' NOT NULL,
	"tags" jsonb,
	"notes" text,
	"use_count" integer DEFAULT 0 NOT NULL,
	"last_used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "foods_name_idx" ON "foods" USING btree ("name");