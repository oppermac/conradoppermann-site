CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"day" date NOT NULL,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"type_id" text NOT NULL,
	"title" text NOT NULL,
	"notes" text,
	"duration_min" integer,
	"people" text[],
	"memorable" boolean DEFAULT false NOT NULL,
	"rating" integer,
	"weights" jsonb,
	"source" text DEFAULT 'manual' NOT NULL,
	"calendar_event_id" text,
	"whoop_workout_id" text,
	"void" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"calendar_id" text NOT NULL,
	"id" text NOT NULL,
	"title" text DEFAULT '' NOT NULL,
	"description" text,
	"location" text,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"all_day" boolean DEFAULT false NOT NULL,
	"status" text,
	"html_link" text,
	"attendees_count" integer DEFAULT 0 NOT NULL,
	"self_response" text,
	"hub_created" boolean DEFAULT false NOT NULL,
	"hub_kind" text,
	"domain" text,
	"kind" text,
	"classified_by" text,
	"confidence" real,
	"deleted" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "calendar_events_calendar_id_id_pk" PRIMARY KEY("calendar_id","id")
);
--> statement-breakpoint
CREATE TABLE "checkins" (
	"day" date PRIMARY KEY NOT NULL,
	"bedtime_local" text,
	"bedtime_status" text,
	"bedtime_source" text,
	"mood" integer,
	"energy" integer,
	"gratitude" text,
	"notes" text,
	"weight_kg" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "classification_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"calendar_id" text,
	"domain" text NOT NULL,
	"kind" text NOT NULL,
	"priority" integer DEFAULT 50 NOT NULL,
	"source" text DEFAULT 'user' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversation_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text DEFAULT 'New conversation' NOT NULL,
	"channel" text DEFAULT 'web' NOT NULL,
	"day" date NOT NULL,
	"last_message_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "insights" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"for_date" date NOT NULL,
	"period_start" date,
	"period_end" date,
	"title" text NOT NULL,
	"body_md" text DEFAULT '' NOT NULL,
	"payload" jsonb,
	"model" text,
	"dedupe_key" text NOT NULL,
	"delivered_at" timestamp with time zone,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "insights_dedupe_key_unique" UNIQUE("dedupe_key")
);
--> statement-breakpoint
CREATE TABLE "job_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"job" text NOT NULL,
	"key" text NOT NULL,
	"attempts" integer DEFAULT 1 NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"ok" boolean,
	"error" text,
	"summary" jsonb
);
--> statement-breakpoint
CREATE TABLE "meal_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"meal_id" uuid NOT NULL,
	"name" text NOT NULL,
	"portion" text,
	"grams" real,
	"kcal" integer DEFAULT 0 NOT NULL,
	"protein_g" real DEFAULT 0 NOT NULL,
	"carbs_g" real DEFAULT 0 NOT NULL,
	"fat_g" real DEFAULT 0 NOT NULL,
	"order_index" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "meals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eaten_at" timestamp with time zone NOT NULL,
	"day" date NOT NULL,
	"slot" text DEFAULT 'snack' NOT NULL,
	"name" text NOT NULL,
	"photo_url" text,
	"source" text DEFAULT 'text' NOT NULL,
	"kcal" integer DEFAULT 0 NOT NULL,
	"protein_g" real DEFAULT 0 NOT NULL,
	"carbs_g" real DEFAULT 0 NOT NULL,
	"fat_g" real DEFAULT 0 NOT NULL,
	"fibre_g" real,
	"confidence" real,
	"ai_model" text,
	"ai_raw" jsonb,
	"status" text DEFAULT 'confirmed' NOT NULL,
	"repeat_of" uuid,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "medication_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"taken_at" timestamp with time zone NOT NULL,
	"day" date NOT NULL,
	"name" text NOT NULL,
	"dose" text,
	"notes" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monday_snapshots" (
	"board_id" text PRIMARY KEY NOT NULL,
	"fetched_at" timestamp with time zone DEFAULT now() NOT NULL,
	"items" jsonb NOT NULL,
	"summary" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neuro_drops" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"week_key" text NOT NULL,
	"day" date NOT NULL,
	"cup" text NOT NULL,
	"drops" integer NOT NULL,
	"type_id" text NOT NULL,
	"source_type" text NOT NULL,
	"source_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oauth_tokens" (
	"provider" text PRIMARY KEY NOT NULL,
	"access_token" text NOT NULL,
	"refresh_token" text,
	"expires_at" timestamp with time zone NOT NULL,
	"scope" text,
	"external_user_id" text,
	"status" text DEFAULT 'ok' NOT NULL,
	"refresh_lock_until" timestamp with time zone,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"relationship" text DEFAULT 'friend' NOT NULL,
	"cadence_days" integer DEFAULT 21 NOT NULL,
	"aliases" text[],
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "push_subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"user_agent" text,
	"fail_count" integer DEFAULT 0 NOT NULL,
	"disabled" boolean DEFAULT false NOT NULL,
	"last_success_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "push_subscriptions_endpoint_unique" UNIQUE("endpoint")
);
--> statement-breakpoint
CREATE TABLE "settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text NOT NULL,
	"type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone,
	"error" text
);
--> statement-breakpoint
CREATE TABLE "whoop_cycles" (
	"id" bigint PRIMARY KEY NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone,
	"timezone_offset" text,
	"score_state" text,
	"strain" real,
	"kilojoule" real,
	"avg_hr" integer,
	"max_hr" integer,
	"day" date NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whoop_recoveries" (
	"cycle_id" bigint PRIMARY KEY NOT NULL,
	"sleep_id" text,
	"score_state" text,
	"recovery_score" real,
	"rhr" real,
	"hrv" real,
	"spo2" real,
	"skin_temp" real,
	"day" date NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whoop_sleeps" (
	"id" text PRIMARY KEY NOT NULL,
	"cycle_id" bigint,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"nap" boolean DEFAULT false NOT NULL,
	"timezone_offset" text,
	"score_state" text,
	"in_bed_ms" integer,
	"awake_ms" integer,
	"light_ms" integer,
	"sws_ms" integer,
	"rem_ms" integer,
	"cycle_count" integer,
	"disturbances" integer,
	"perf_pct" real,
	"eff_pct" real,
	"consistency_pct" real,
	"resp_rate" real,
	"bedtime_local" text,
	"wake_local" text,
	"day" date NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "whoop_workouts" (
	"id" text PRIMARY KEY NOT NULL,
	"start" timestamp with time zone NOT NULL,
	"end" timestamp with time zone NOT NULL,
	"timezone_offset" text,
	"sport_name" text,
	"sport_id" integer,
	"score_state" text,
	"strain" real,
	"avg_hr" integer,
	"max_hr" integer,
	"kilojoule" real,
	"distance_m" real,
	"zone_ms" jsonb,
	"duration_min" integer DEFAULT 0 NOT NULL,
	"kind" text DEFAULT 'other' NOT NULL,
	"kind_override" text,
	"counts_as_session" boolean DEFAULT false NOT NULL,
	"day" date NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversation_messages" ADD CONSTRAINT "conversation_messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meal_items" ADD CONSTRAINT "meal_items_meal_id_meals_id_fk" FOREIGN KEY ("meal_id") REFERENCES "public"."meals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "activities_day_idx" ON "activities" USING btree ("day");--> statement-breakpoint
CREATE INDEX "activities_domain_day_idx" ON "activities" USING btree ("domain","day");--> statement-breakpoint
CREATE UNIQUE INDEX "activities_calendar_event_uq" ON "activities" USING btree ("calendar_event_id") WHERE "activities"."calendar_event_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "activities_whoop_workout_uq" ON "activities" USING btree ("whoop_workout_id") WHERE "activities"."whoop_workout_id" is not null;--> statement-breakpoint
CREATE INDEX "calendar_events_start_idx" ON "calendar_events" USING btree ("start");--> statement-breakpoint
CREATE INDEX "calendar_events_domain_start_idx" ON "calendar_events" USING btree ("domain","start");--> statement-breakpoint
CREATE INDEX "classification_rules_priority_idx" ON "classification_rules" USING btree ("priority");--> statement-breakpoint
CREATE INDEX "conversation_messages_conv_idx" ON "conversation_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "insights_kind_date_idx" ON "insights" USING btree ("kind","for_date");--> statement-breakpoint
CREATE UNIQUE INDEX "job_runs_job_key_uq" ON "job_runs" USING btree ("job","key");--> statement-breakpoint
CREATE INDEX "job_runs_started_idx" ON "job_runs" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "meal_items_meal_idx" ON "meal_items" USING btree ("meal_id");--> statement-breakpoint
CREATE INDEX "meals_day_idx" ON "meals" USING btree ("day");--> statement-breakpoint
CREATE INDEX "medication_log_day_idx" ON "medication_log" USING btree ("day");--> statement-breakpoint
CREATE UNIQUE INDEX "neuro_drops_source_cup_uq" ON "neuro_drops" USING btree ("source_type","source_id","cup");--> statement-breakpoint
CREATE INDEX "neuro_drops_week_idx" ON "neuro_drops" USING btree ("week_key");--> statement-breakpoint
CREATE INDEX "whoop_cycles_day_idx" ON "whoop_cycles" USING btree ("day");--> statement-breakpoint
CREATE INDEX "whoop_recoveries_day_idx" ON "whoop_recoveries" USING btree ("day");--> statement-breakpoint
CREATE INDEX "whoop_sleeps_day_idx" ON "whoop_sleeps" USING btree ("day");--> statement-breakpoint
CREATE INDEX "whoop_sleeps_start_idx" ON "whoop_sleeps" USING btree ("start");--> statement-breakpoint
CREATE INDEX "whoop_workouts_day_idx" ON "whoop_workouts" USING btree ("day");--> statement-breakpoint
CREATE INDEX "whoop_workouts_start_idx" ON "whoop_workouts" USING btree ("start");