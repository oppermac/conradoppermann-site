/** Static fixtures for /hub/dev/coach — no network, no database. */
import type { Brief } from "../ai/brief";
import type { Review } from "../ai/review";
import type { CoachData } from "../queries/coach";

export const FIXTURE_BRIEF: Brief = {
  headline: "Recovery is solid — protect the CEO block this afternoon",
  body_md:
    "**Recovery 71%**, HRV a touch below your 7-day average but sleep was 7h 40m in the window. Today has one CEO block (14:00–16:00) and a walk with Sarah at 18:00.\n\n- Recovery 71% · sleep 7h 40m\n- CEO block already on the calendar\n- Two friend plans still open this week\n\nThe one thing: confirm the CEO block stays untouched — it's the only protected work time today.",
  top3: [
    { domain: "work", action: "Protect the 14:00 CEO block", when: "Today 14:00" },
    { domain: "relationships", action: "Text Aoife to lock in Thursday", when: "Today" },
    { domain: "body", action: "Keep the walk with Sarah at 18:00", when: "Today 18:00" },
  ],
  watchouts: ["Two friend plans still open with four days left in the week", "HRV slightly below your 7-day average"],
};

export const FIXTURE_REVIEW: Review = {
  headline: "A strong work week, relationships fell behind",
  scorecard: [
    { domain: "work", score: 9, hits: "3 CEO blocks and the operating review all landed", misses: "None" },
    { domain: "body", score: 7, hits: "4 sessions, 2 cardio + 2 strength", misses: "Bedtime slipped twice" },
    { domain: "relationships", score: 4, hits: "Family call on Sunday", misses: "No friend plans made it onto the calendar" },
    { domain: "aliveness", score: 6, hits: "Cinema with Sarah on Friday", misses: "No memorable experience this month yet" },
  ],
  wins: ["All 3 CEO blocks protected for the second week running", "4 training sessions with the 2/2 cardio-strength split"],
  adjust: ["Book Thursday's friend plan on Monday, not Thursday", "Move bedtime reminder 15 minutes earlier"],
  next_week: [
    { domain: "relationships", commitment: "Dinner with Aoife", when: "Thu 19:00" },
    { domain: "aliveness", commitment: "Book something memorable for the weekend", when: "Sat" },
  ],
  reflection_question: "What made this week feel like work was in flow?",
  body_md:
    "**Work carried the week** — three CEO blocks and the operating review all landed, and the roadmap moved. Body held at four sessions with a clean cardio/strength split, though bedtime slipped on Tuesday and Wednesday.\n\nRelationships is the gap: only the Sunday family call counted, and no friend plan made it onto the calendar despite two being on the list. Aliveness had one bright spot at the cinema with Sarah but nothing memorable yet this month.\n\nNext week, book the friend plan early in the week rather than leaving it to Thursday.",
};

const FIXTURE_DAY = "2026-09-06";

export const FIXTURE_COACH_DATA: CoachData = {
  dbConnected: true,
  brief: {
    id: "fixture-brief-1",
    title: FIXTURE_BRIEF.headline,
    bodyMd: FIXTURE_BRIEF.body_md,
    forDate: FIXTURE_DAY,
    readAt: null,
  },
  review: {
    id: "fixture-review-1",
    title: FIXTURE_REVIEW.headline,
    bodyMd: FIXTURE_REVIEW.body_md,
    forDate: FIXTURE_DAY,
    readAt: new Date().toISOString(),
  },
  conversations: [
    { id: "fixture-conversation-1", title: "This morning's plan", day: FIXTURE_DAY, lastMessageAt: new Date().toISOString() },
    { id: "fixture-conversation-2", title: "Sunday review", day: "2026-08-31", lastMessageAt: "2026-08-31T18:20:00.000Z" },
  ],
};

/** A conversation with assistant text, a completed tool receipt, and a pending calendar confirmation. */
export const FIXTURE_THREAD_ITEMS = [
  { kind: "user" as const, id: "fx-u1", text: "Log a 40 minute run and then book Thursday's CEO block." },
  {
    kind: "assistant" as const,
    id: "fx-a1",
    text: "Nice work — logging that now. Your recovery is 71% today so a steady run was a good call.",
    streaming: false,
  },
  { kind: "receipt" as const, id: "fx-r1", name: "log_activity", summary: "Logged 40 min run", isError: false, running: false },
  {
    kind: "assistant" as const,
    id: "fx-a2",
    text: "Now for Thursday — you have a free slot 09:00–11:00. Here's the block:",
    streaming: false,
  },
  {
    kind: "pending" as const,
    id: "fx-p1",
    name: "create_calendar_block",
    input: { title: "CEO Block", start: "2026-09-10 09:00", end: "2026-09-10 11:00", kind: "ceo_block", description: null },
    summary: "CEO Block · 2026-09-10 09:00 → 2026-09-10 11:00",
  },
];
