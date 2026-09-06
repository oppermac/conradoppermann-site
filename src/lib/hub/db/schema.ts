import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const ts = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = () => ts("created_at").notNull().defaultNow();
const updatedAt = () => ts("updated_at").notNull().defaultNow();

export type OAuthProvider = "whoop" | "google";
export type ScoreState = "SCORED" | "PENDING_SCORE" | "UNSCORABLE";
export type WorkoutKind = "cardio" | "strength" | "mixed" | "mobility" | "movement" | "leisure" | "recovery" | "other";
export type ClassifiedBy = "rule" | "ai" | "user";
export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack";
export type MealSource = "photo" | "text" | "repeat" | "coach" | "mcp";
export type ActivitySource = "manual" | "calendar" | "whoop" | "coach" | "mcp" | "meals" | "monday" | "hub";
export type Relationship = "family" | "longstanding" | "friend" | "team";
export type InsightKind = "brief" | "review" | "nudge";

/** Key/value settings; each top-level settings section is one row (see lib/hub/settings.ts). */
export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").notNull(),
  updatedAt: updatedAt(),
});

export const oauthTokens = pgTable("oauth_tokens", {
  provider: text("provider").primaryKey().$type<OAuthProvider>(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  expiresAt: ts("expires_at").notNull(),
  scope: text("scope"),
  externalUserId: text("external_user_id"),
  status: text("status").notNull().default("ok").$type<"ok" | "reauth_required">(),
  /** Single-statement refresh claim; neon-http has no transactions. */
  refreshLockUntil: ts("refresh_lock_until"),
  raw: jsonb("raw"),
  updatedAt: updatedAt(),
});

export const whoopCycles = pgTable(
  "whoop_cycles",
  {
    id: bigint("id", { mode: "number" }).primaryKey(),
    start: ts("start").notNull(),
    end: ts("end"),
    timezoneOffset: text("timezone_offset"),
    scoreState: text("score_state").$type<ScoreState>(),
    strain: real("strain"),
    kilojoule: real("kilojoule"),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    day: date("day").notNull(),
    raw: jsonb("raw"),
    updatedAt: updatedAt(),
  },
  (t) => [index("whoop_cycles_day_idx").on(t.day)],
);

export const whoopRecoveries = pgTable(
  "whoop_recoveries",
  {
    cycleId: bigint("cycle_id", { mode: "number" }).primaryKey(),
    sleepId: text("sleep_id"),
    scoreState: text("score_state").$type<ScoreState>(),
    recoveryScore: real("recovery_score"),
    rhr: real("rhr"),
    hrv: real("hrv"),
    spo2: real("spo2"),
    skinTemp: real("skin_temp"),
    day: date("day").notNull(),
    raw: jsonb("raw"),
    updatedAt: updatedAt(),
  },
  (t) => [index("whoop_recoveries_day_idx").on(t.day)],
);

export const whoopSleeps = pgTable(
  "whoop_sleeps",
  {
    id: text("id").primaryKey(),
    cycleId: bigint("cycle_id", { mode: "number" }),
    start: ts("start").notNull(),
    end: ts("end").notNull(),
    nap: boolean("nap").notNull().default(false),
    timezoneOffset: text("timezone_offset"),
    scoreState: text("score_state").$type<ScoreState>(),
    inBedMs: integer("in_bed_ms"),
    awakeMs: integer("awake_ms"),
    lightMs: integer("light_ms"),
    swsMs: integer("sws_ms"),
    remMs: integer("rem_ms"),
    cycleCount: integer("cycle_count"),
    disturbances: integer("disturbances"),
    perfPct: real("perf_pct"),
    effPct: real("eff_pct"),
    consistencyPct: real("consistency_pct"),
    respRate: real("resp_rate"),
    bedtimeLocal: text("bedtime_local"),
    wakeLocal: text("wake_local"),
    /** Local date of `end` — the morning the sleep belongs to. */
    day: date("day").notNull(),
    raw: jsonb("raw"),
    updatedAt: updatedAt(),
  },
  (t) => [index("whoop_sleeps_day_idx").on(t.day), index("whoop_sleeps_start_idx").on(t.start)],
);

export const whoopWorkouts = pgTable(
  "whoop_workouts",
  {
    id: text("id").primaryKey(),
    start: ts("start").notNull(),
    end: ts("end").notNull(),
    timezoneOffset: text("timezone_offset"),
    sportName: text("sport_name"),
    sportId: integer("sport_id"),
    scoreState: text("score_state").$type<ScoreState>(),
    strain: real("strain"),
    avgHr: integer("avg_hr"),
    maxHr: integer("max_hr"),
    kilojoule: real("kilojoule"),
    distanceM: real("distance_m"),
    zoneMs: jsonb("zone_ms"),
    durationMin: integer("duration_min").notNull().default(0),
    kind: text("kind").notNull().default("other").$type<WorkoutKind>(),
    kindOverride: text("kind_override").$type<WorkoutKind>(),
    countsAsSession: boolean("counts_as_session").notNull().default(false),
    day: date("day").notNull(),
    raw: jsonb("raw"),
    updatedAt: updatedAt(),
  },
  (t) => [index("whoop_workouts_day_idx").on(t.day), index("whoop_workouts_start_idx").on(t.start)],
);

export const calendarEvents = pgTable(
  "calendar_events",
  {
    calendarId: text("calendar_id").notNull(),
    id: text("id").notNull(),
    title: text("title").notNull().default(""),
    description: text("description"),
    location: text("location"),
    start: ts("start").notNull(),
    end: ts("end").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    status: text("status"),
    htmlLink: text("html_link"),
    attendeesCount: integer("attendees_count").notNull().default(0),
    selfResponse: text("self_response"),
    hubCreated: boolean("hub_created").notNull().default(false),
    hubKind: text("hub_kind"),
    domain: text("domain"),
    kind: text("kind"),
    classifiedBy: text("classified_by").$type<ClassifiedBy>(),
    confidence: real("confidence"),
    deleted: boolean("deleted").notNull().default(false),
    raw: jsonb("raw"),
    syncedAt: ts("synced_at").notNull().defaultNow(),
    updatedAt: updatedAt(),
  },
  (t) => [
    primaryKey({ columns: [t.calendarId, t.id] }),
    index("calendar_events_start_idx").on(t.start),
    index("calendar_events_domain_start_idx").on(t.domain, t.start),
  ],
);

export const classificationRules = pgTable(
  "classification_rules",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pattern: text("pattern").notNull(),
    calendarId: text("calendar_id"),
    domain: text("domain").notNull(),
    kind: text("kind").notNull(),
    priority: integer("priority").notNull().default(50),
    source: text("source").notNull().default("user").$type<"seed" | "user">(),
    createdAt: createdAt(),
  },
  (t) => [index("classification_rules_priority_idx").on(t.priority)],
);

export const meals = pgTable(
  "meals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eatenAt: ts("eaten_at").notNull(),
    day: date("day").notNull(),
    slot: text("slot").notNull().default("snack").$type<MealSlot>(),
    name: text("name").notNull(),
    photoUrl: text("photo_url"),
    source: text("source").notNull().default("text").$type<MealSource>(),
    kcal: integer("kcal").notNull().default(0),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    fibreG: real("fibre_g"),
    confidence: real("confidence"),
    aiModel: text("ai_model"),
    aiRaw: jsonb("ai_raw"),
    status: text("status").notNull().default("confirmed"),
    repeatOf: uuid("repeat_of"),
    notes: text("notes"),
    createdAt: createdAt(),
  },
  (t) => [index("meals_day_idx").on(t.day)],
);

export const mealItems = pgTable(
  "meal_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mealId: uuid("meal_id")
      .notNull()
      .references(() => meals.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    portion: text("portion"),
    grams: real("grams"),
    kcal: integer("kcal").notNull().default(0),
    proteinG: real("protein_g").notNull().default(0),
    carbsG: real("carbs_g").notNull().default(0),
    fatG: real("fat_g").notNull().default(0),
    orderIndex: integer("order_index").notNull().default(0),
  },
  (t) => [index("meal_items_meal_idx").on(t.mealId)],
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    occurredAt: ts("occurred_at").notNull(),
    day: date("day").notNull(),
    domain: text("domain").notNull(),
    kind: text("kind").notNull(),
    typeId: text("type_id").notNull(),
    title: text("title").notNull(),
    notes: text("notes"),
    durationMin: integer("duration_min"),
    people: text("people").array(),
    memorable: boolean("memorable").notNull().default(false),
    rating: integer("rating"),
    weights: jsonb("weights"),
    source: text("source").notNull().default("manual").$type<ActivitySource>(),
    calendarEventId: text("calendar_event_id"),
    whoopWorkoutId: text("whoop_workout_id"),
    void: boolean("void").notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [
    index("activities_day_idx").on(t.day),
    index("activities_domain_day_idx").on(t.domain, t.day),
    uniqueIndex("activities_calendar_event_uq").on(t.calendarEventId).where(sql`${t.calendarEventId} is not null`),
    uniqueIndex("activities_whoop_workout_uq").on(t.whoopWorkoutId).where(sql`${t.whoopWorkoutId} is not null`),
  ],
);

export const medicationLog = pgTable(
  "medication_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    takenAt: ts("taken_at").notNull(),
    day: date("day").notNull(),
    name: text("name").notNull(),
    dose: text("dose"),
    notes: text("notes"),
    source: text("source").notNull().default("manual").$type<ActivitySource>(),
    createdAt: createdAt(),
  },
  (t) => [index("medication_log_day_idx").on(t.day)],
);

export const people = pgTable("people", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull().default("friend").$type<Relationship>(),
  cadenceDays: integer("cadence_days").notNull().default(21),
  aliases: text("aliases").array(),
  notes: text("notes"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

export const neuroDrops = pgTable(
  "neuro_drops",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    weekKey: text("week_key").notNull(),
    day: date("day").notNull(),
    cup: text("cup").notNull(),
    drops: integer("drops").notNull(),
    typeId: text("type_id").notNull(),
    sourceType: text("source_type").notNull(),
    sourceId: text("source_id").notNull(),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex("neuro_drops_source_cup_uq").on(t.sourceType, t.sourceId, t.cup),
    index("neuro_drops_week_idx").on(t.weekKey),
  ],
);

export const checkins = pgTable("checkins", {
  day: date("day").primaryKey(),
  bedtimeLocal: text("bedtime_local"),
  bedtimeStatus: text("bedtime_status").$type<"early" | "in" | "late">(),
  bedtimeSource: text("bedtime_source").$type<"whoop" | "manual">(),
  mood: integer("mood"),
  energy: integer("energy"),
  gratitude: text("gratitude"),
  notes: text("notes"),
  weightKg: real("weight_kg"),
  updatedAt: updatedAt(),
});

export const insights = pgTable(
  "insights",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull().$type<InsightKind>(),
    forDate: date("for_date").notNull(),
    periodStart: date("period_start"),
    periodEnd: date("period_end"),
    title: text("title").notNull(),
    bodyMd: text("body_md").notNull().default(""),
    payload: jsonb("payload"),
    model: text("model"),
    dedupeKey: text("dedupe_key").notNull().unique(),
    deliveredAt: ts("delivered_at"),
    readAt: ts("read_at"),
    createdAt: createdAt(),
  },
  (t) => [index("insights_kind_date_idx").on(t.kind, t.forDate)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  userAgent: text("user_agent"),
  failCount: integer("fail_count").notNull().default(0),
  disabled: boolean("disabled").notNull().default(false),
  lastSuccessAt: ts("last_success_at"),
  createdAt: createdAt(),
});

export const mondaySnapshots = pgTable("monday_snapshots", {
  boardId: text("board_id").primaryKey(),
  fetchedAt: ts("fetched_at").notNull().defaultNow(),
  items: jsonb("items").notNull(),
  summary: jsonb("summary").notNull(),
});

export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  title: text("title").notNull().default("New conversation"),
  channel: text("channel").notNull().default("web").$type<"web" | "mcp">(),
  day: date("day").notNull(),
  lastMessageAt: ts("last_message_at"),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
});

/** Anthropic content blocks stored verbatim so history replays without transformation. */
export const conversationMessages = pgTable(
  "conversation_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    role: text("role").notNull().$type<"user" | "assistant">(),
    content: jsonb("content").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("conversation_messages_conv_idx").on(t.conversationId, t.createdAt)],
);

export const jobRuns = pgTable(
  "job_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    job: text("job").notNull(),
    key: text("key").notNull(),
    attempts: integer("attempts").notNull().default(1),
    startedAt: ts("started_at").notNull().defaultNow(),
    finishedAt: ts("finished_at"),
    ok: boolean("ok"),
    error: text("error"),
    summary: jsonb("summary"),
  },
  (t) => [uniqueIndex("job_runs_job_key_uq").on(t.job, t.key), index("job_runs_started_idx").on(t.startedAt)],
);

export const webhookEvents = pgTable("webhook_events", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  type: text("type").notNull(),
  payload: jsonb("payload").notNull(),
  receivedAt: ts("received_at").notNull().defaultNow(),
  processedAt: ts("processed_at"),
  error: text("error"),
});
