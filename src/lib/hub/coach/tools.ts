import type Anthropic from "@anthropic-ai/sdk";
import { ACTIVITY_TYPES } from "../domain/activity-types";

const LOGGABLE = ACTIVITY_TYPES.filter((t) => t.loggable).map((t) => t.id);

/** Tools the coach can call. Calendar writes require Conrad's confirmation (handled by the loop). */
export const COACH_TOOLS: Anthropic.Beta.BetaTool[] = [
  {
    name: "get_state",
    description: "The current state of Conrad's programme: today's calendar, Whoop, week progress per domain, gaps, cups, meals, people overdue, Monday rocks. Call this before advising if the system context might be stale.",
    strict: true,
    input_schema: { type: "object", properties: { scope: { type: "string", enum: ["today", "week"] } }, required: ["scope"], additionalProperties: false },
  },
  {
    name: "get_gaps",
    description: "This week's gaps (done + scheduled vs target) with named suggestions and free slots that would close them.",
    strict: true,
    input_schema: { type: "object", properties: {}, required: [], additionalProperties: false },
  },
  {
    name: "log_activity",
    description: `Log something Conrad did (not a meal). type_id must be one of: ${LOGGABLE.join(", ")}. Use people for who he was with (first names). occurred_at may be an ISO time or "YYYY-MM-DD HH:MM" in Dublin time; omit for now.`,
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        type_id: { type: "string", enum: LOGGABLE },
        title: { type: ["string", "null"] },
        occurred_at: { type: ["string", "null"] },
        duration_min: { type: ["integer", "null"] },
        people: { type: ["array", "null"], items: { type: "string" } },
        memorable: { type: ["boolean", "null"] },
        rating: { type: ["integer", "null"], enum: [1, 2, 3, 4, 5, null] },
        notes: { type: ["string", "null"] },
      },
      required: ["type_id", "title", "occurred_at", "duration_min", "people", "memorable", "rating", "notes"],
      additionalProperties: false,
    },
  },
  {
    name: "log_meal",
    description: "Log a meal from a description such as '2 eggs, sourdough, flat white'. The hub estimates calories and macros and saves it.",
    strict: true,
    input_schema: { type: "object", properties: { text: { type: "string" }, slot: { type: ["string", "null"], enum: ["breakfast", "lunch", "dinner", "snack", null] } }, required: ["text", "slot"], additionalProperties: false },
  },
  {
    name: "repeat_meal",
    description: "Log a meal Conrad has had before, matched by name (e.g. 'the chicken salad').",
    strict: true,
    input_schema: { type: "object", properties: { query: { type: "string" } }, required: ["query"], additionalProperties: false },
  },
  {
    name: "log_medication",
    description: "Add a medication entry to the plain list when Conrad says he took something.",
    strict: true,
    input_schema: { type: "object", properties: { name: { type: "string" }, dose: { type: ["string", "null"] } }, required: ["name", "dose"], additionalProperties: false },
  },
  {
    name: "create_calendar_block",
    description: "Book a block in Conrad's private calendar (CEO Block, Operating Review, training, seeing someone, something enjoyable). Times are ISO with offset or 'YYYY-MM-DD HH:MM' Dublin time. Conrad confirms before it is created.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        start: { type: "string" },
        end: { type: "string" },
        kind: { type: "string", enum: ["ceo_block", "operating_review", "training", "friend_plan", "family_touchpoint", "date", "enjoyable", "memorable", "walk", "rest"] },
        description: { type: ["string", "null"] },
      },
      required: ["title", "start", "end", "kind", "description"],
      additionalProperties: false,
    },
  },
  {
    name: "set_checkin",
    description: "Record today's check-in: mood and energy 1–5, a gratitude line, notes, or weight in kg.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        day: { type: ["string", "null"] },
        mood: { type: ["integer", "null"] },
        energy: { type: ["integer", "null"] },
        gratitude: { type: ["string", "null"] },
        notes: { type: ["string", "null"] },
        weight_kg: { type: ["number", "null"] },
      },
      required: ["day", "mood", "energy", "gratitude", "notes", "weight_kg"],
      additionalProperties: false,
    },
  },
  {
    name: "list_recent",
    description: "Recent meals, activities, workouts or calendar events over the last N days.",
    strict: true,
    input_schema: { type: "object", properties: { what: { type: "string", enum: ["meals", "activities", "workouts", "events"] }, days: { type: "integer" } }, required: ["what", "days"], additionalProperties: false },
  },
];

export const CONFIRM_TOOLS = new Set(["create_calendar_block"]);
