"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CircleAlert, CircleCheck, CircleX, TriangleAlert } from "lucide-react";
import { SettingsCard } from "./controls";

type ProviderStatus = {
  configured: boolean;
  dbConnected: boolean;
  connected: boolean;
  status?: "ok" | "reauth_required";
  externalUserId?: string | null;
  lastSyncAt?: string | null;
};
type WhoopStatus = ProviderStatus;
type CalendarStatus = ProviderStatus & { events?: number };
type CalendarOption = { id: string; summary: string; primary: boolean };

function timeAgo(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ConnectBanner() {
  const params = useSearchParams();
  const connected = params.get("connected");
  const error = params.get("error");
  const reason = params.get("reason");
  if (!connected && !error) return null;
  const name = (v: string | null) => (v === "whoop" ? "Whoop" : v === "google" ? "Google Calendar" : v);
  if (connected) {
    return (
      <div className="hub-card flex items-center gap-2 p-4 text-[15px] font-medium text-good">
        <CircleCheck size={16} aria-hidden />
        {name(connected)} connected.
      </div>
    );
  }
  return (
    <div className="hub-card flex items-center gap-2 p-4 text-[15px] font-medium text-bad">
      <CircleX size={16} aria-hidden />
      Couldn’t connect {name(error)}
      {reason ? ` — ${reason}` : ""}.
    </div>
  );
}

function StatusChip({ status }: { status: ProviderStatus | null }) {
  if (!status) return <span className="text-[13px] font-semibold text-ink-3">Checking…</span>;
  if (!status.configured) {
    return (
      <a href="/hub/settings#setup" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3">
        <CircleAlert size={14} aria-hidden /> Not configured
      </a>
    );
  }
  if (status.status === "reauth_required") {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-warn">
        <TriangleAlert size={14} aria-hidden /> Needs reconnecting
      </span>
    );
  }
  if (status.connected) {
    return (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-good">
        <CircleCheck size={14} aria-hidden /> Connected{status.externalUserId ? ` as ${status.externalUserId}` : ""}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3">
      <CircleX size={14} aria-hidden /> Not connected
    </span>
  );
}

function DisconnectButton({ onConfirm, busy }: { onConfirm: () => void; busy: boolean }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const t = setTimeout(() => setConfirming(false), 4000);
    return () => clearTimeout(t);
  }, [confirming]);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => (confirming ? onConfirm() : setConfirming(true))}
      className={`hub-press h-11 rounded-full px-4 text-[13px] font-semibold disabled:opacity-40 ${
        confirming ? "bg-bad text-white" : "border border-hairline text-bad"
      }`}
    >
      {confirming ? "Sure?" : "Disconnect"}
    </button>
  );
}

function ProviderRow({
  label,
  status,
  startHref,
  onSync,
  onDisconnect,
  busy,
  children,
}: {
  label: string;
  status: ProviderStatus | null;
  startHref: string;
  onSync: () => void;
  onDisconnect: () => void;
  busy: "sync" | "disconnect" | null;
  children?: React.ReactNode;
}) {
  const canAct = Boolean(status?.configured);
  const showConnect = canAct && (!status?.connected || status?.status === "reauth_required");
  const ago = timeAgo(status?.lastSyncAt);

  return (
    <div className="flex flex-col gap-2 px-3 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-[15px] font-semibold">{label}</div>
        <StatusChip status={status} />
      </div>
      {ago ? <div className="text-[13px] text-ink-2">Last synced {ago}</div> : null}
      <div className="flex flex-wrap items-center gap-2">
        {showConnect ? (
          <a href={startHref} className="hub-press flex h-11 items-center rounded-full bg-ink px-4 text-[13px] font-semibold text-page">
            Connect
          </a>
        ) : null}
        {canAct && status?.connected ? (
          <button
            type="button"
            onClick={onSync}
            disabled={busy !== null}
            className="hub-press h-11 rounded-full border border-hairline px-4 text-[13px] font-semibold disabled:opacity-40"
          >
            {busy === "sync" ? "Syncing…" : "Sync now"}
          </button>
        ) : null}
        {canAct && status?.connected ? <DisconnectButton busy={busy !== null} onConfirm={onDisconnect} /> : null}
      </div>
      {children}
    </div>
  );
}

export function IntegrationsSection() {
  const [whoop, setWhoop] = useState<WhoopStatus | null>(null);
  const [whoopBusy, setWhoopBusy] = useState<"sync" | "disconnect" | null>(null);
  const [google, setGoogle] = useState<CalendarStatus | null>(null);
  const [googleBusy, setGoogleBusy] = useState<"sync" | "disconnect" | null>(null);
  const [calendars, setCalendars] = useState<CalendarOption[] | null>(null);
  const [writeId, setWriteId] = useState<string | null>(null);
  const [mondayConfigured, setMondayConfigured] = useState<boolean | null>(null);
  const [mondayBusy, setMondayBusy] = useState(false);
  const [mondayResult, setMondayResult] = useState<string | null>(null);

  async function refresh() {
    const [w, g, h, s] = await Promise.all([
      fetch("/hub/api/whoop/status").then((r) => r.json()).catch(() => null),
      fetch("/hub/api/calendar/status").then((r) => r.json()).catch(() => null),
      fetch("/hub/api/health").then((r) => r.json()).catch(() => null),
      fetch("/hub/api/settings").then((r) => r.json()).catch(() => null),
    ]);
    if (w) setWhoop(w);
    if (g) setGoogle(g);
    if (h) setMondayConfigured(Boolean(h.env?.MONDAY_API_TOKEN));
    if (s?.settings?.calendars) setWriteId(s.settings.calendars.write ?? null);
    if (g?.connected) {
      fetch("/hub/api/calendar/calendars")
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { calendars?: CalendarOption[] } | null) => setCalendars(data?.calendars ?? null))
        .catch(() => setCalendars(null));
    } else {
      setCalendars(null);
    }
  }

  useEffect(() => {
    queueMicrotask(refresh);
  }, []);

  async function syncWhoop() {
    setWhoopBusy("sync");
    try {
      await fetch("/hub/api/whoop/sync?days=3", { method: "POST" });
    } finally {
      setWhoopBusy(null);
      refresh();
    }
  }
  async function disconnectWhoop() {
    setWhoopBusy("disconnect");
    try {
      await fetch("/hub/api/oauth/whoop/disconnect", { method: "POST" });
    } finally {
      setWhoopBusy(null);
      refresh();
    }
  }
  async function syncGoogle() {
    setGoogleBusy("sync");
    try {
      await fetch("/hub/api/calendar/sync", { method: "POST" });
    } finally {
      setGoogleBusy(null);
      refresh();
    }
  }
  async function disconnectGoogle() {
    setGoogleBusy("disconnect");
    try {
      await fetch("/hub/api/oauth/google/disconnect", { method: "POST" });
    } finally {
      setGoogleBusy(null);
      refresh();
    }
  }
  async function syncMonday() {
    setMondayBusy(true);
    setMondayResult(null);
    try {
      const res = await fetch("/hub/api/monday/sync", { method: "POST" });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setMondayResult("Synced.");
    } catch (err) {
      setMondayResult(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setMondayBusy(false);
    }
  }

  return (
    <>
      <Suspense fallback={null}>
        <ConnectBanner />
      </Suspense>
      <SettingsCard title="Integrations">
        <div className="divide-y divide-hairline rounded-tile border border-hairline">
          <ProviderRow
            label="Whoop"
            status={whoop}
            startHref="/hub/api/oauth/whoop/start"
            onSync={syncWhoop}
            onDisconnect={disconnectWhoop}
            busy={whoopBusy}
          />
          <ProviderRow
            label="Google Calendar"
            status={google}
            startHref="/hub/api/oauth/google/start"
            onSync={syncGoogle}
            onDisconnect={disconnectGoogle}
            busy={googleBusy}
          >
            {calendars && calendars.length > 0 ? (
              <ul className="mt-1 flex flex-col gap-1">
                {calendars.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-[13px] text-ink-2">
                    <span className="truncate">{c.summary}</span>
                    {c.id === writeId ? (
                      <span className="shrink-0 rounded-full bg-tint/12 px-2 py-0.5 text-[11px] font-semibold text-tint">write here</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
          </ProviderRow>
          <div className="flex flex-col gap-2 px-3 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-[15px] font-semibold">Monday</div>
              {mondayConfigured === null ? (
                <span className="text-[13px] font-semibold text-ink-3">Checking…</span>
              ) : mondayConfigured ? (
                <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-good">
                  <CircleCheck size={14} aria-hidden /> Configured
                </span>
              ) : (
                <a href="/hub/settings#setup" className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3">
                  <CircleAlert size={14} aria-hidden /> Not configured
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={syncMonday}
                disabled={mondayBusy || !mondayConfigured}
                className="hub-press h-11 rounded-full border border-hairline px-4 text-[13px] font-semibold disabled:opacity-40"
              >
                {mondayBusy ? "Syncing…" : "Sync now"}
              </button>
            </div>
            {mondayResult ? <div className="text-[13px] text-ink-2">{mondayResult}</div> : null}
          </div>
        </div>
      </SettingsCard>
    </>
  );
}
