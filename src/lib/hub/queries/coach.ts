/** Data for the Coach page: today's brief, the latest review, and the recent conversations list. */
import { and, desc, eq } from "drizzle-orm";
import { db, hasDb } from "../db/client";
import { conversations, insights } from "../db/schema";
import { dayKey } from "../time";

export type CoachInsightSummary = {
  id: string;
  title: string;
  bodyMd: string;
  forDate: string;
  readAt: string | null;
};

export type CoachConversationSummary = {
  id: string;
  title: string;
  day: string;
  lastMessageAt: string | null;
};

export async function coachData() {
  if (!hasDb) {
    return {
      dbConnected: false as const,
      brief: null as CoachInsightSummary | null,
      review: null as CoachInsightSummary | null,
      conversations: [] as CoachConversationSummary[],
    };
  }

  const today = dayKey();
  const [briefRow, reviewRow, convRows] = await Promise.all([
    db
      .select()
      .from(insights)
      .where(and(eq(insights.kind, "brief"), eq(insights.forDate, today)))
      .orderBy(desc(insights.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db
      .select()
      .from(insights)
      .where(eq(insights.kind, "review"))
      .orderBy(desc(insights.createdAt))
      .limit(1)
      .then((r) => r[0] ?? null),
    db.select().from(conversations).orderBy(desc(conversations.updatedAt)).limit(20),
  ]);

  return {
    dbConnected: true as const,
    brief: briefRow
      ? { id: briefRow.id, title: briefRow.title, bodyMd: briefRow.bodyMd, forDate: briefRow.forDate, readAt: briefRow.readAt?.toISOString() ?? null }
      : null,
    review: reviewRow
      ? { id: reviewRow.id, title: reviewRow.title, bodyMd: reviewRow.bodyMd, forDate: reviewRow.forDate, readAt: reviewRow.readAt?.toISOString() ?? null }
      : null,
    conversations: convRows.map((c) => ({
      id: c.id,
      title: c.title,
      day: c.day,
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
    })),
  };
}

export type CoachData = Awaited<ReturnType<typeof coachData>>;
