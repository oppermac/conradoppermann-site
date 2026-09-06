import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { TriangleAlert } from "lucide-react";
import { PageHeader } from "../../../components/PageHeader";
import { renderMarkdownLite } from "../../../components/coach/markdown";
import { ReflectionField } from "./ReflectionField";
import { db, hasDb } from "@/lib/hub/db/client";
import { insights } from "@/lib/hub/db/schema";
import type { Brief } from "@/lib/hub/ai/brief";
import type { Review } from "@/lib/hub/ai/review";
import { DOMAIN_META, type Domain } from "@/lib/hub/domain/programme";
import { formatDayLong } from "@/lib/hub/time";

export const metadata = { title: "Insight" };

/* ------------------------------------- Brief ------------------------------------- */

export function BriefDetail({ id, forDate, readAt, brief }: { id: string; forDate: string; readAt: string | null; brief: Brief }) {
  void id;
  void readAt;
  return (
    <div className="flex flex-col gap-4">
      <section className="hub-card p-5">
        <div className="hub-eyebrow">{formatDayLong(forDate)}</div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">{brief.headline}</h1>
        <div className="mt-3 text-[15px] leading-relaxed text-ink-2 [&_ul]:mt-1 [&_ol]:mt-1 [&_p+p]:mt-3">
          {renderMarkdownLite(brief.body_md)}
        </div>
      </section>

      {brief.top3.length > 0 ? (
        <section>
          <div className="hub-eyebrow mb-2">Top 3</div>
          <ul className="hub-card divide-y divide-hairline overflow-hidden">
            {brief.top3.map((t, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: `var(${DOMAIN_META[t.domain as Domain]?.colorVar ?? "--hub-ink-3"})` }}
                  aria-hidden
                />
                <span className="min-w-0 flex-1 text-[15px] leading-snug">{t.action}</span>
                <span className="hub-tabular shrink-0 text-[13px] font-medium text-ink-2">{t.when}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {brief.watchouts.length > 0 ? (
        <section className="hub-card p-5">
          <div className="hub-eyebrow">Watch for</div>
          <ul className="mt-2 flex flex-col gap-2">
            {brief.watchouts.map((w, i) => (
              <li key={i} className="flex items-start gap-2 text-[15px] leading-snug text-ink-2">
                <TriangleAlert size={15} className="mt-0.5 shrink-0 text-warn" aria-hidden />
                {w}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------- Review ------------------------------------- */

export function ReviewDetail({ id, forDate, readAt, review }: { id: string; forDate: string; readAt: string | null; review: Review }) {
  void id;
  void readAt;
  return (
    <div className="flex flex-col gap-4">
      <section className="hub-card p-5">
        <div className="hub-eyebrow">Week of {formatDayLong(forDate)}</div>
        <h1 className="mt-1 text-[22px] font-semibold leading-tight">{review.headline}</h1>
        <div className="mt-3 text-[15px] leading-relaxed text-ink-2 [&_ul]:mt-1 [&_ol]:mt-1 [&_p+p]:mt-3">
          {renderMarkdownLite(review.body_md)}
        </div>
      </section>

      <section>
        <div className="hub-eyebrow mb-2">Scorecard</div>
        <ul className="hub-card divide-y divide-hairline overflow-hidden">
          {review.scorecard.map((s) => (
            <li key={s.domain} className="flex flex-col gap-1 px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(${DOMAIN_META[s.domain].colorVar})` }} aria-hidden />
                <span className="text-[15px] font-semibold">{DOMAIN_META[s.domain].label}</span>
                <span className="hub-tabular ml-auto text-[15px] font-semibold text-ink-2">{s.score}/10</span>
              </div>
              <p className="pl-[18px] text-[13px] text-ink-2">
                <span className="font-medium text-good">Hits</span> {s.hits}
              </p>
              <p className="pl-[18px] text-[13px] text-ink-2">
                <span className="font-medium text-warn">Misses</span> {s.misses}
              </p>
            </li>
          ))}
        </ul>
      </section>

      {review.wins.length > 0 ? (
        <section className="hub-card p-5">
          <div className="hub-eyebrow">Wins</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-snug">
            {review.wins.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {review.adjust.length > 0 ? (
        <section className="hub-card p-5">
          <div className="hub-eyebrow">Adjust</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] leading-snug">
            {review.adjust.map((a, i) => (
              <li key={i}>{a}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {review.next_week.length > 0 ? (
        <section>
          <div className="hub-eyebrow mb-2">Next week</div>
          <ul className="hub-card divide-y divide-hairline overflow-hidden">
            {review.next_week.map((n, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-3">
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: `var(${DOMAIN_META[n.domain].colorVar})` }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] leading-snug">{n.commitment}</div>
                  <div className="text-[13px] text-ink-2">{n.when}</div>
                </div>
                <Link
                  href={{ pathname: "/hub/coach", query: { seed: `Book: ${n.commitment} ${n.when}` } }}
                  className="hub-press shrink-0 text-[13px] font-semibold text-tint"
                >
                  Add to calendar
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <ReflectionField question={review.reflection_question} />
    </div>
  );
}

/* -------------------------------------- Nudge -------------------------------------- */

export function NudgeDetail({ title, bodyMd }: { title: string; bodyMd: string }) {
  return (
    <section className="hub-card p-5">
      <h1 className="text-[20px] font-semibold leading-tight">{title}</h1>
      <div className="mt-3 text-[15px] leading-relaxed text-ink-2 [&_ul]:mt-1 [&_ol]:mt-1 [&_p+p]:mt-3">{renderMarkdownLite(bodyMd)}</div>
    </section>
  );
}

/* --------------------------------------- Page --------------------------------------- */

export default async function InsightDetailPage({ params }: PageProps<"/hub/insights/[id]">) {
  const { id } = await params;

  if (!hasDb) {
    return (
      <>
        <PageHeader title="Insight" />
        <section className="hub-card p-4">
          <p className="text-[15px] font-medium text-warn">The database isn’t connected yet.</p>
        </section>
      </>
    );
  }

  const [row] = await db.select().from(insights).where(eq(insights.id, id)).limit(1);
  if (!row) notFound();

  if (!row.readAt) {
    await db.update(insights).set({ readAt: new Date() }).where(eq(insights.id, id));
  }
  const readAt = row.readAt?.toISOString() ?? null;

  const payload = (row.payload ?? null) as { brief?: Brief; review?: Review } | null;

  return (
    <>
      <PageHeader eyebrow={row.kind} title={row.title} />
      {row.kind === "brief" && payload?.brief ? (
        <BriefDetail id={row.id} forDate={row.forDate} readAt={readAt} brief={payload.brief} />
      ) : row.kind === "review" && payload?.review ? (
        <ReviewDetail id={row.id} forDate={row.forDate} readAt={readAt} review={payload.review} />
      ) : (
        <NudgeDetail title={row.title} bodyMd={row.bodyMd} />
      )}
    </>
  );
}
