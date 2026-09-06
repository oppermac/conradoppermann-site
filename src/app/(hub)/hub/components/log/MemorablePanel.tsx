"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";

type Activity = { id: string; title: string; day: string; memorable: boolean; typeId: string };

export function MemorablePanel() {
  const router = useRouter();
  const [items, setItems] = useState<Activity[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/hub/api/activities")
      .then((r) => r.json())
      .then((d: { activities?: Activity[] }) => {
        if (cancelled) return;
        setItems((d.activities ?? []).slice(0, 20));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, []);

  async function toggle(a: Activity) {
    setItems((list) => list.map((x) => (x.id === a.id ? { ...x, memorable: !x.memorable } : x)));
    await fetch(`/hub/api/activities/${a.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ memorable: !a.memorable }) });
    router.refresh();
  }

  if (!loaded) return <p className="text-[15px] text-ink-2">Loading…</p>;
  if (items.length === 0) return <p className="text-[15px] text-ink-2">Nothing logged in the last two weeks yet.</p>;
  return (
    <ul className="divide-y divide-hairline rounded-tile border border-hairline">
      {items.map((a) => (
        <li key={a.id} className="flex items-center justify-between gap-3 px-3 py-2">
          <div className="min-w-0">
            <div className="truncate text-[15px]">{a.title}</div>
            <div className="text-[12px] text-ink-3">{a.day}</div>
          </div>
          <button type="button" aria-pressed={a.memorable} aria-label={a.memorable ? "Unmark memorable" : "Mark memorable"} onClick={() => toggle(a)} className={`hub-press flex h-11 w-11 items-center justify-center rounded-full ${a.memorable ? "text-alive" : "text-ink-3"}`}>
            <Star size={20} fill={a.memorable ? "currentColor" : "none"} aria-hidden />
          </button>
        </li>
      ))}
    </ul>
  );
}
