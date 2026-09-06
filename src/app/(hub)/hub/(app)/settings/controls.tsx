"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Settings, SettingsSection } from "@/lib/hub/settings";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Section-level save: PATCHes `/hub/api/settings` with `{ [section]: value }`,
 * tracks saving/error state, and flashes "Saved" for 2s.
 */
export function useSectionSave<K extends SettingsSection>(section: K, dbConnected: boolean) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  const save = useCallback(
    async (value: Settings[K]) => {
      if (!dbConnected) return;
      if (timer.current) clearTimeout(timer.current);
      setStatus("saving");
      setError(null);
      try {
        const res = await fetch("/hub/api/settings", {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ [section]: value }),
        });
        const data: { error?: string } = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Save failed");
        setStatus("saved");
        timer.current = setTimeout(() => setStatus("idle"), 2000);
      } catch (err) {
        setStatus("error");
        setError(err instanceof Error ? err.message : "Save failed");
      }
    },
    [section, dbConnected],
  );

  return { status, error, save };
}

export function SettingsCard({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="hub-card p-5">
      <h2 className="hub-eyebrow">{title}</h2>
      {hint ? <p className="mt-1 text-[15px] text-ink-2">{hint}</p> : null}
      <div className="mt-3 flex flex-col gap-4">{children}</div>
    </section>
  );
}

export function GroupLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-1 text-[13px] font-semibold text-ink-2">{children}</div>;
}

export function InsetList({ children }: { children: React.ReactNode }) {
  return <div className="divide-y divide-hairline rounded-tile border border-hairline">{children}</div>;
}

export function SaveBar({
  status,
  error,
  disabled,
  onSave,
}: {
  status: SaveStatus;
  error: string | null;
  disabled?: boolean;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={onSave}
        disabled={disabled || status === "saving"}
        className="hub-press rounded-full bg-ink px-5 py-2.5 text-[15px] font-semibold text-page disabled:opacity-40"
      >
        {status === "saving" ? "Saving…" : "Save"}
      </button>
      <span aria-live="polite">
        {status === "saved" ? <span className="text-[13px] font-medium text-good">Saved</span> : null}
        {status === "error" ? (
          <span className="text-[13px] font-medium text-bad">{error ?? "Something went wrong"}</span>
        ) : null}
      </span>
    </div>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
}) {
  const round = (n: number) => Math.round(n * 100) / 100;
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] text-ink-2">{hint}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          onClick={() => onChange(round(Math.max(min, value - step)))}
          disabled={value <= min}
          className="hub-press flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-semibold text-tint disabled:opacity-30"
        >
          −
        </button>
        <span className="hub-tabular w-10 text-center text-[15px] font-semibold">{value}</span>
        <button
          type="button"
          aria-label={`Increase ${label}`}
          onClick={() => onChange(round(Math.min(max, value + step)))}
          disabled={value >= max}
          className="hub-press flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-semibold text-tint disabled:opacity-30"
        >
          +
        </button>
      </div>
    </div>
  );
}

export function Switch({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  hint?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] text-ink-2">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`hub-press relative h-8 w-[51px] shrink-0 rounded-full transition-colors ${
          checked ? "bg-good" : "bg-ink/15"
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-7 w-7 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[19px]" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

export function TimeField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] text-ink-2">{hint}</div> : null}
      </div>
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="hub-tabular h-11 shrink-0 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
      />
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
  hint,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: Array<{ value: T; label: string }>;
  hint?: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] text-ink-2">{hint}</div> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="h-11 shrink-0 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function NumberField({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
  disabled,
  placeholder,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: string;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [text, setText] = useState(value === null ? "" : String(value));
  // Resync the local typing buffer when `value` changes from outside (e.g. a reset),
  // without fighting the user's keystrokes: adjust state during render rather than in
  // an effect (react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setText(value === null ? "" : String(value));
  }

  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <div className="text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] text-ink-2">{hint}</div> : null}
      </div>
      <input
        type="number"
        inputMode="decimal"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          const trimmed = text.trim();
          if (trimmed === "") {
            onChange(null);
            return;
          }
          const n = Number(trimmed);
          onChange(Number.isFinite(n) ? n : null);
        }}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        placeholder={placeholder}
        className="hub-tabular h-11 w-24 shrink-0 rounded-control border border-hairline bg-elevated px-2 text-right text-[15px] disabled:opacity-40"
      />
    </div>
  );
}

export function TextRow({
  children,
  onRemove,
  removeLabel,
}: {
  children: React.ReactNode;
  onRemove: () => void;
  removeLabel: string;
}) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0 flex-1 text-[15px]">{children}</div>
      <button
        type="button"
        aria-label={removeLabel}
        onClick={onRemove}
        className="hub-press shrink-0 text-[13px] font-semibold text-bad"
      >
        Remove
      </button>
    </div>
  );
}
