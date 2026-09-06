"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";

export type Brief = {
  id: string;
  title: string;
  bodyMd: string;
  readAt: string | null;
} | null;

function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean);
  return parts.map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={`${keyPrefix}-${i}`} className="font-semibold text-ink">
        {part.slice(2, -2)}
      </strong>
    ) : (
      <span key={`${keyPrefix}-${i}`}>{part}</span>
    ),
  );
}

/** Simple markdown: **bold** and "- "/"* " list lines only, nothing else. */
function renderBodyMd(md: string): React.ReactNode[] {
  const lines = md.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flushList = (key: string) => {
    if (!list.length) return;
    out.push(
      <ul key={key} className="ml-4 list-disc space-y-1">
        {list.map((item, i) => (
          <li key={i}>{renderInline(item, key)}</li>
        ))}
      </ul>,
    );
    list = [];
  };
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    if (/^[-*]\s+/.test(trimmed)) {
      list.push(trimmed.replace(/^[-*]\s+/, ""));
      return;
    }
    flushList(`list-${i}`);
    if (trimmed) out.push(<p key={i}>{renderInline(trimmed, `p-${i}`)}</p>);
  });
  flushList("list-end");
  return out;
}

/**
 * Today's brief: headline + simple markdown body, collapsing to just the headline once read. Chips hand
 * off to the coach; when there's no brief yet, a quiet prompt writes one on demand.
 */
export function BriefCard({ brief }: { brief: Brief }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [expanded, setExpanded] = useState(!brief?.readAt);
  const [writing, setWriting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const spring = reduce ? { duration: 0 } : { type: "spring" as const, visualDuration: 0.35, bounce: 0 };

  async function writeNow() {
    setWriting(true);
    setError(null);
    try {
      const res = await fetch("/hub/api/insights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "brief" }),
      });
      if (!res.ok) {
        const body: { error?: string } = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Couldn't write the brief");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't write the brief");
    } finally {
      setWriting(false);
    }
  }

  if (!brief) {
    return (
      <section className="hub-card p-5">
        <div className="hub-eyebrow">Today’s brief</div>
        <p className="mt-1 text-[15px] text-ink-2">No brief yet today.</p>
        {error ? <p className="mt-1 text-[13px] text-bad">{error}</p> : null}
        <button
          type="button"
          onClick={writeNow}
          disabled={writing}
          className="hub-press mt-3 min-h-11 rounded-control bg-ink px-4 text-[14px] font-semibold text-page disabled:opacity-50"
        >
          {writing ? "Writing…" : "Write it now"}
        </button>
      </section>
    );
  }

  return (
    <motion.section layout transition={spring} className="hub-card p-5">
      <div className="hub-eyebrow">Today’s brief</div>
      <button type="button" onClick={() => setExpanded((e) => !e)} className="hub-press mt-1 block w-full text-left">
        <h2 className="text-[19px] font-semibold leading-snug text-ink">{brief.title}</h2>
        {!expanded ? <span className="mt-1 inline-block text-[13px] font-semibold text-tint">Read</span> : null}
      </button>
      {expanded ? (
        <motion.div layout="position" className="mt-2 space-y-2 text-[15px] leading-snug text-ink-2">
          {renderBodyMd(brief.bodyMd)}
          <div className="flex flex-wrap gap-2 pt-1">
            <Link href="/hub/coach?seed=brief" className="hub-press flex min-h-9 items-center rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-ink-2">
              Ask a follow-up
            </Link>
            <Link href="/hub/coach?seed=plan" className="hub-press flex min-h-9 items-center rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-ink-2">
              Plan today
            </Link>
          </div>
        </motion.div>
      ) : null}
    </motion.section>
  );
}
