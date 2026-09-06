"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityType } from "@/lib/hub/domain/activity-types";
import { DOMAIN_META, type Domain } from "@/lib/hub/domain/programme";
import { Toast, type ToastState } from "../sheet/Toast";

type Person = { id: string; name: string };

const ORDER: Domain[] = ["body", "relationships", "aliveness", "work"];

export function ActivityForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [types, setTypes] = useState<ActivityType[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [typeId, setTypeId] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [freePerson, setFreePerson] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [rating, setRating] = useState<number | null>(null);
  const [memorable, setMemorable] = useState(false);
  const [when, setWhen] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetch("/hub/api/activities").then((r) => r.json()), fetch("/hub/api/people").then((r) => r.json())])
      .then(([a, p]: [{ types?: ActivityType[] }, { people?: Person[] }]) => {
        if (cancelled) return;
        setTypes(a.types ?? []);
        setPeople(p.people ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const type = types.find((t) => t.id === typeId);
  const social = type && (type.domain === "relationships" || type.domain === "aliveness");

  async function save() {
    if (!typeId) return;
    setBusy(true);
    setError(null);
    const allPeople = [...chosen, ...freePerson.split(",").map((s) => s.trim()).filter(Boolean)];
    const res = await fetch("/hub/api/activities", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ typeId, title: title || null, people: allPeople.length ? allPeople : null, durationMin: duration, rating, memorable, occurredAt: when ? when.replace("T", " ") : null }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string; activity?: { id: string; title: string } };
    setBusy(false);
    if (!res.ok || !data.activity) {
      setError(data.error ?? "Couldn’t save that.");
      return;
    }
    const id = data.activity.id;
    setToast({ message: `Logged ${data.activity.title}`, undo: async () => fetch(`/hub/api/activities/${id}`, { method: "DELETE" }).then(() => router.refresh()) });
    setTypeId(null);
    setTitle("");
    setChosen([]);
    setFreePerson("");
    setDuration(null);
    setRating(null);
    setMemorable(false);
    setWhen("");
    router.refresh();
    onDone?.();
  }

  return (
    <div className="flex flex-col gap-4">
      {!typeId ? (
        <div className="flex flex-col gap-3">
          {ORDER.map((d) => {
            const group = types.filter((t) => t.domain === d);
            if (!group.length) return null;
            return (
              <div key={d}>
                <div className="hub-eyebrow" style={{ color: `var(${DOMAIN_META[d].colorVar})` }}>
                  {DOMAIN_META[d].label}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-2">
                  {group.map((t) => (
                    <button key={t.id} type="button" onClick={() => setTypeId(t.id)} className="hub-press min-h-11 rounded-full border border-hairline bg-card px-3.5 text-[15px] font-medium">
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
          {types.length === 0 ? <p className="text-[15px] text-ink-2">Loading types…</p> : null}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="text-[17px] font-semibold">{type?.label}</div>
            <button type="button" className="hub-press text-[15px] text-tint" onClick={() => setTypeId(null)}>
              Change
            </button>
          </div>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title (optional)" className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px]" />
          {social || type?.id === "team_sport" ? (
            <div>
              <div className="text-[13px] font-semibold text-ink-2">Who with</div>
              <div className="mt-1.5 flex flex-wrap gap-2">
                {people.map((p) => {
                  const on = chosen.includes(p.name);
                  return (
                    <button key={p.id} type="button" onClick={() => setChosen((c) => (on ? c.filter((n) => n !== p.name) : [...c, p.name]))} className={`hub-press min-h-9 rounded-full px-3 text-[14px] font-medium ${on ? "bg-ink text-page" : "border border-hairline bg-card"}`}>
                      {p.name}
                    </button>
                  );
                })}
              </div>
              <input value={freePerson} onChange={(e) => setFreePerson(e.target.value)} placeholder="Other names, comma separated" className="mt-2 h-11 w-full rounded-control border border-hairline bg-card px-3 text-[15px]" />
            </div>
          ) : null}
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
              Minutes
              <input type="number" inputMode="numeric" min={1} max={1440} value={duration ?? ""} onChange={(e) => setDuration(e.target.value ? Number(e.target.value) : null)} className="h-11 rounded-control border border-hairline bg-card px-3 text-[17px] font-normal text-ink" />
            </label>
            <label className="flex flex-col gap-1 text-[13px] font-semibold text-ink-2">
              Earlier
              <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} className="h-11 rounded-control border border-hairline bg-card px-3 text-[15px] font-normal text-ink" />
            </label>
          </div>
          {social ? (
            <div>
              <div className="text-[13px] font-semibold text-ink-2">How was it</div>
              <div className="mt-1.5 flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button" aria-label={`${n} of 5`} aria-pressed={rating === n} onClick={() => setRating(n)} className={`hub-press h-11 w-11 rounded-full text-[15px] font-semibold ${rating === n ? "bg-ink text-page" : "border border-hairline bg-card"}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
          <label className="flex min-h-11 items-center justify-between gap-3 text-[15px]">
            Memorable
            <button type="button" role="switch" aria-checked={memorable} onClick={() => setMemorable((m) => !m)} className={`relative h-7 w-12 rounded-full transition-colors ${memorable ? "bg-good" : "bg-ink/20"}`}>
              <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform ${memorable ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`} />
            </button>
          </label>
          {error ? <p className="text-[13px] text-bad">{error}</p> : null}
          <button type="button" disabled={busy} onClick={save} className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50">
            {busy ? "Saving…" : "Log it"}
          </button>
        </div>
      )}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
