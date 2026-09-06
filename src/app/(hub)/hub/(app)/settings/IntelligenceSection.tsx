"use client";

import { useState } from "react";
import { SettingsCard } from "./controls";

type TickResponse = { ok?: boolean; error?: string; ran?: Array<{ job: string; ms: number }>; skipped?: string[]; failed?: Array<{ job: string; error: string }> };

async function runInsight(kind: "brief" | "review"): Promise<string> {
  const res = await fetch("/hub/api/insights", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, force: true }),
  });
  const data: { error?: string; insight?: { title?: string } } = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "That didn't work");
  return data.insight?.title ? `Written: “${data.insight.title}”` : "Written.";
}

async function runTick(job: string): Promise<string> {
  const res = await fetch(`/hub/api/cron/tick?job=${job}&force=1`);
  const data: TickResponse = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) throw new Error(data.failed?.[0]?.error ?? data.error ?? "That didn't work");
  if (data.ran?.length) return `Done in ${data.ran[0].ms}ms.`;
  if (data.skipped?.length) return "Already up to date today.";
  return "Done.";
}

function ActionRow({ label, hint, run }: { label: string; hint?: string; run: () => Promise<string> }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);

  async function go() {
    setBusy(true);
    setResult(null);
    try {
      const text = await run();
      setResult({ ok: true, text });
    } catch (err) {
      setResult({ ok: false, text: err instanceof Error ? err.message : "That didn't work" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5 px-3 py-2.5">
      <div className="flex min-h-11 flex-wrap items-center justify-between gap-3">
        {hint ? <div className="min-w-0 text-[13px] text-ink-2">{hint}</div> : <span />}
        <button
          type="button"
          onClick={go}
          disabled={busy}
          className="hub-press h-11 shrink-0 rounded-full border border-hairline px-4 text-[15px] font-semibold disabled:opacity-40"
        >
          {busy ? "Working…" : label}
        </button>
      </div>
      {result ? (
        <div aria-live="polite" className={`text-[13px] font-medium ${result.ok ? "text-good" : "text-bad"}`}>
          {result.text}
        </div>
      ) : null}
    </div>
  );
}

export function IntelligenceSection() {
  return (
    <SettingsCard title="Intelligence" hint="Run the coach's scheduled writing on demand — each can take up to a minute">
      <div className="divide-y divide-hairline rounded-tile border border-hairline">
        <ActionRow label="Write today's brief now" hint="Replaces today's brief" run={() => runInsight("brief")} />
        <ActionRow label="Write this week's review now" hint="Replaces the latest review" run={() => runInsight("review")} />
        <ActionRow label="Evaluate cups now" hint="Recomputes this week's cups" run={() => runTick("cups.evaluate")} />
        <ActionRow label="Run nudges now" hint="Checks for anything worth a nudge" run={() => runTick("nudges")} />
      </div>
    </SettingsCard>
  );
}
