"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Camera, ChevronLeft, ClipboardCheck, Pill, RotateCcw, Scale, Star, Type } from "lucide-react";
import type { MealEstimate } from "@/lib/hub/meals/schema";
import { ActivityForm } from "../log/ActivityForm";
import { CheckinForm } from "../log/CheckinForm";
import { MedicationForm } from "../log/MedicationForm";
import { MemorablePanel } from "../log/MemorablePanel";
import { MealCamera } from "../food/MealCamera";
import { MealConfirmSheet } from "../food/MealConfirmSheet";
import { RecentMeals } from "../food/RecentMeals";
import { TextMealForm } from "../food/TextMealForm";
import { Toast, type ToastState } from "./Toast";

export type LogPanel = "menu" | "photo" | "repeat" | "activity" | "checkin" | "text" | "medication" | "weight" | "memorable";

const TITLES: Record<LogPanel, string> = {
  menu: "Log",
  photo: "Photo meal",
  repeat: "Repeat a meal",
  activity: "Activity",
  checkin: "Check-in",
  text: "Text meal",
  medication: "Medication",
  weight: "Weight",
  memorable: "Memorable",
};

type Draft = { estimate: MealEstimate; photoUrl: string | null; model: string } | null;

export function LogSheet({ panel, setPanel, onDone, inline = false }: { panel: LogPanel; setPanel: (p: LogPanel) => void; onDone?: () => void; inline?: boolean }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState>(null);

  const tile = (p: LogPanel, Icon: typeof Camera, label: string) => (
    <button key={p} type="button" onClick={() => setPanel(p)} className="hub-press hub-elevated flex min-h-[88px] flex-col items-start justify-between p-3.5 text-left">
      <Icon size={22} className="text-tint" aria-hidden />
      <span className="text-[15px] font-semibold">{label}</span>
    </button>
  );
  const chip = (p: LogPanel, Icon: typeof Camera, label: string) => (
    <button key={p} type="button" onClick={() => setPanel(p)} className="hub-press flex min-h-11 items-center gap-1.5 rounded-full border border-hairline bg-card px-3.5 text-[14px] font-medium">
      <Icon size={16} className="text-ink-2" aria-hidden />
      {label}
    </button>
  );

  function saved(saved: { id: string; day: string; name: string }) {
    setDraft(null);
    setToast({ message: `Logged ${saved.name}`, undo: async () => fetch(`/hub/api/meals/${saved.id}`, { method: "DELETE" }).then(() => router.refresh()) });
    router.refresh();
    setPanel("menu");
    if (!inline) setTimeout(() => onDone?.(), 1200);
  }

  async function reanalyse(hint: string) {
    if (!draft?.photoUrl) return;
    const res = await fetch("/hub/api/meals/analyze", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ photoUrl: draft.photoUrl, hint }) });
    const data = (await res.json().catch(() => ({}))) as { estimate?: MealEstimate; model?: string };
    if (data.estimate) setDraft({ estimate: data.estimate, photoUrl: draft.photoUrl, model: data.model ?? draft.model });
  }

  const showDraft = draft && (panel === "photo" || panel === "text");

  return (
    <div className="flex flex-col gap-4 pb-6">
      <div className="flex items-center gap-2">
        {panel !== "menu" ? (
          <button type="button" aria-label="Back" onClick={() => { setDraft(null); setError(null); setPanel("menu"); }} className="hub-press flex h-9 w-9 items-center justify-center rounded-full bg-card text-ink-2">
            <ChevronLeft size={20} aria-hidden />
          </button>
        ) : null}
        <h2 className="text-[20px] font-semibold">{TITLES[panel]}</h2>
      </div>
      {error ? <p className="rounded-tile bg-bad/10 px-3 py-2 text-[13px] text-bad">{error}</p> : null}

      {panel === "menu" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {tile("photo", Camera, "Photo meal")}
            {tile("repeat", RotateCcw, "Repeat meal")}
            {tile("activity", Activity, "Activity")}
            {tile("checkin", ClipboardCheck, "Check-in")}
          </div>
          <div className="flex flex-wrap gap-2">
            {chip("text", Type, "Text meal")}
            {chip("medication", Pill, "Medication")}
            {chip("weight", Scale, "Weight")}
            {chip("memorable", Star, "Memorable")}
          </div>
        </>
      ) : null}

      {showDraft ? (
        <MealConfirmSheet estimate={draft.estimate} photoUrl={draft.photoUrl} model={draft.model} onSaved={saved} onCancel={() => setDraft(null)} onReanalyse={reanalyse} />
      ) : panel === "photo" ? (
        <MealCamera onEstimate={(estimate, photoUrl, model) => { setError(null); setDraft({ estimate, photoUrl, model }); }} onError={setError} />
      ) : panel === "text" ? (
        <TextMealForm onEstimate={(estimate, photoUrl, model) => { setError(null); setDraft({ estimate, photoUrl, model }); }} onError={setError} />
      ) : null}
      {panel === "repeat" ? <RecentMeals /> : null}
      {panel === "activity" ? <ActivityForm /> : null}
      {panel === "checkin" ? <CheckinForm /> : null}
      {panel === "weight" ? <CheckinForm weightOnly /> : null}
      {panel === "medication" ? <MedicationForm /> : null}
      {panel === "memorable" ? <MemorablePanel /> : null}
      <Toast toast={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
