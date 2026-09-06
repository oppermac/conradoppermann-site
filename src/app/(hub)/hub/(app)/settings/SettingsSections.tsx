"use client";

import { useState } from "react";
import type { Settings } from "@/lib/hub/settings";
import {
  GroupLabel,
  InsetList,
  NumberField,
  SaveBar,
  SelectField,
  SettingsCard,
  Stepper,
  Switch,
  TextRow,
  TimeField,
  useSectionSave,
} from "./controls";

export function DbNotice() {
  const message =
    "The database isn't connected yet — settings show defaults and can't be saved";
  return (
    <section className="hub-card p-4">
      <p className="text-[15px] font-medium text-warn">{message}</p>
    </section>
  );
}

/* ---------------------------------- Targets ---------------------------------- */

export function TargetsSection({ initial, dbConnected }: { initial: Settings["targets"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("targets", dbConnected);

  return (
    <SettingsCard title="Targets">
      <div>
        <GroupLabel>Work</GroupLabel>
        <InsetList>
          <Stepper
            label="CEO blocks per week"
            value={draft.work.ceoBlocks}
            min={0}
            max={10}
            onChange={(v) => setDraft((d) => ({ ...d, work: { ...d.work, ceoBlocks: v } }))}
          />
          <Stepper
            label="Operating reviews per week"
            value={draft.work.opReview}
            min={0}
            max={5}
            onChange={(v) => setDraft((d) => ({ ...d, work: { ...d.work, opReview: v } }))}
          />
        </InsetList>
      </div>
      <div>
        <GroupLabel>Body</GroupLabel>
        <InsetList>
          <Stepper
            label="Sessions per week"
            value={draft.body.sessions}
            min={0}
            max={14}
            onChange={(v) => setDraft((d) => ({ ...d, body: { ...d.body, sessions: v } }))}
          />
          <Stepper
            label="Minimum sessions per week"
            value={draft.body.minSessions}
            min={0}
            max={14}
            onChange={(v) => setDraft((d) => ({ ...d, body: { ...d.body, minSessions: v } }))}
          />
          <Stepper
            label="Cardio sessions per week"
            value={draft.body.cardio}
            min={0}
            max={14}
            onChange={(v) => setDraft((d) => ({ ...d, body: { ...d.body, cardio: v } }))}
          />
          <Stepper
            label="Strength sessions per week"
            value={draft.body.strength}
            min={0}
            max={14}
            onChange={(v) => setDraft((d) => ({ ...d, body: { ...d.body, strength: v } }))}
          />
          <Stepper
            label="Minimum session length"
            hint="Minutes"
            value={draft.body.minSessionMin}
            min={5}
            max={120}
            step={5}
            onChange={(v) => setDraft((d) => ({ ...d, body: { ...d.body, minSessionMin: v } }))}
          />
        </InsetList>
      </div>
      <div>
        <GroupLabel>Relationships</GroupLabel>
        <InsetList>
          <Stepper
            label="Friend plans per week"
            value={draft.relationships.friendPlans}
            min={0}
            max={14}
            onChange={(v) => setDraft((d) => ({ ...d, relationships: { ...d.relationships, friendPlans: v } }))}
          />
          <Stepper
            label="Family touchpoints per week"
            value={draft.relationships.familyTouch}
            min={0}
            max={7}
            onChange={(v) => setDraft((d) => ({ ...d, relationships: { ...d.relationships, familyTouch: v } }))}
          />
        </InsetList>
      </div>
      <div>
        <GroupLabel>Aliveness</GroupLabel>
        <InsetList>
          <Stepper
            label="Enjoyable activities per week"
            value={draft.aliveness.enjoyable}
            min={0}
            max={7}
            onChange={(v) => setDraft((d) => ({ ...d, aliveness: { ...d.aliveness, enjoyable: v } }))}
          />
          <Stepper
            label="Memorable experiences per month"
            value={draft.aliveness.memorablePerMonth}
            min={0}
            max={10}
            onChange={(v) => setDraft((d) => ({ ...d, aliveness: { ...d.aliveness, memorablePerMonth: v } }))}
          />
        </InsetList>
      </div>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* --------------------------------- Nutrition --------------------------------- */

const NUTRITION_MODES: Array<{ value: Settings["nutrition"]["mode"]; label: string }> = [
  { value: "maintain", label: "Maintain" },
  { value: "lose", label: "Lose" },
  { value: "build", label: "Build" },
];

export function NutritionSection({ initial, dbConnected }: { initial: Settings["nutrition"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("nutrition", dbConnected);

  const derivedAtLabel = draft.derivedAt
    ? new Date(draft.derivedAt).toLocaleDateString("en-IE", { day: "numeric", month: "short", year: "numeric" })
    : null;
  const derivedHint = `Derived from your Whoop energy expenditure each Monday${
    derivedAtLabel ? ` — last updated ${derivedAtLabel}` : ""
  }`;

  return (
    <SettingsCard title="Nutrition">
      <InsetList>
        <SelectField
          label="Mode"
          value={draft.mode}
          options={NUTRITION_MODES}
          onChange={(v) => setDraft((d) => ({ ...d, mode: v }))}
        />
        <Switch
          label="Derived from Whoop"
          checked={draft.derived}
          hint={draft.derived ? derivedHint : undefined}
          onChange={(v) => setDraft((d) => ({ ...d, derived: v }))}
        />
        <NumberField
          label="Calories"
          value={draft.kcal}
          min={800}
          max={6000}
          step={10}
          placeholder="kcal"
          disabled={draft.derived}
          onChange={(v) => setDraft((d) => ({ ...d, kcal: v }))}
        />
        <NumberField
          label="Protein"
          value={draft.proteinG}
          min={0}
          max={400}
          step={1}
          placeholder="g"
          disabled={draft.derived}
          onChange={(v) => setDraft((d) => ({ ...d, proteinG: v }))}
        />
        <NumberField
          label="Carbs"
          value={draft.carbsG}
          min={0}
          max={800}
          step={1}
          placeholder="g"
          disabled={draft.derived}
          onChange={(v) => setDraft((d) => ({ ...d, carbsG: v }))}
        />
        <NumberField
          label="Fat"
          value={draft.fatG}
          min={0}
          max={300}
          step={1}
          placeholder="g"
          disabled={draft.derived}
          onChange={(v) => setDraft((d) => ({ ...d, fatG: v }))}
        />
        <NumberField
          label="Protein per kg"
          value={draft.proteinPerKg}
          min={0.8}
          max={3}
          step={0.1}
          onChange={(v) => setDraft((d) => ({ ...d, proteinPerKg: v ?? d.proteinPerKg }))}
        />
        <NumberField
          label="Fat percentage"
          value={draft.fatPct}
          min={0.15}
          max={0.45}
          step={0.05}
          onChange={(v) => setDraft((d) => ({ ...d, fatPct: v ?? d.fatPct }))}
        />
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* ----------------------------------- Sleep ----------------------------------- */

export function SleepSection({ initial, dbConnected }: { initial: Settings["sleep"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("sleep", dbConnected);

  return (
    <SettingsCard title="Sleep">
      <InsetList>
        <TimeField label="Bedtime start" value={draft.bedtimeStart} onChange={(v) => setDraft((d) => ({ ...d, bedtimeStart: v }))} />
        <TimeField label="Bedtime end" value={draft.bedtimeEnd} onChange={(v) => setDraft((d) => ({ ...d, bedtimeEnd: v }))} />
        <Stepper
          label="Grace period"
          hint="Minutes"
          value={draft.graceMin}
          min={0}
          max={60}
          step={5}
          onChange={(v) => setDraft((d) => ({ ...d, graceMin: v }))}
        />
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* --------------------------------- Calendars --------------------------------- */

export function CalendarsSection({ initial, dbConnected }: { initial: Settings["calendars"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const [newId, setNewId] = useState("");
  const { status, error, save } = useSectionSave("calendars", dbConnected);

  function addId() {
    const trimmed = newId.trim();
    if (!trimmed) return;
    setDraft((d) => (d.read.includes(trimmed) ? d : { ...d, read: [...d.read, trimmed] }));
    setNewId("");
  }

  return (
    <SettingsCard title="Calendars" hint="The live calendar list appears here once Google is connected">
      <div>
        <GroupLabel>Read</GroupLabel>
        <InsetList>
          {draft.read.map((id) => (
            <TextRow
              key={id}
              removeLabel={`Remove ${id}`}
              onRemove={() => setDraft((d) => ({ ...d, read: d.read.filter((r) => r !== id) }))}
            >
              <code className="block truncate text-[13px]">{id}</code>
            </TextRow>
          ))}
          <div className="flex items-center gap-2 px-3 py-2">
            <input
              value={newId}
              onChange={(e) => setNewId(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addId();
                }
              }}
              placeholder="Add calendar id"
              className="h-11 min-w-0 flex-1 rounded-control border border-hairline bg-elevated px-2 text-[13px]"
            />
            <button
              type="button"
              onClick={addId}
              disabled={!newId.trim()}
              className="hub-press shrink-0 rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-page disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </InsetList>
      </div>
      <div>
        <GroupLabel>Write to</GroupLabel>
        <InsetList>
          <div className="px-3 py-2">
            <input
              value={draft.write ?? ""}
              onChange={(e) => setDraft((d) => ({ ...d, write: e.target.value === "" ? null : e.target.value }))}
              placeholder="Calendar id"
              className="h-11 w-full rounded-control border border-hairline bg-elevated px-2 text-[13px]"
            />
          </div>
        </InsetList>
      </div>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* ----------------------------------- People ----------------------------------- */

type Relationship = "family" | "longstanding" | "friend" | "team";
type Person = { id: string; name: string; relationship: Relationship; cadenceDays: number };
type RowStatus = "idle" | "saving" | "saved" | "error";

const RELATIONSHIP_OPTIONS: Array<{ value: Relationship; label: string }> = [
  { value: "family", label: "Family" },
  { value: "longstanding", label: "Longstanding friend" },
  { value: "friend", label: "Friend" },
  { value: "team", label: "Team" },
];

function sortByName(rows: Person[]): Person[] {
  return [...rows].sort((a, b) => a.name.localeCompare(b.name));
}

function PersonRow({
  person,
  onChange,
  onRemove,
}: {
  person: Person;
  onChange: (next: Person) => void;
  onRemove: (id: string) => void;
}) {
  const [name, setName] = useState(person.name);
  const [status, setStatus] = useState<RowStatus>("idle");

  async function patch(fields: Partial<Pick<Person, "name" | "relationship" | "cadenceDays">>) {
    setStatus("saving");
    try {
      const res = await fetch(`/hub/api/people/${person.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(fields),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      onChange({ ...person, ...fields });
      setStatus("saved");
      setTimeout(() => setStatus((s) => (s === "saved" ? "idle" : s)), 2000);
    } catch {
      setStatus("error");
    }
  }

  async function remove() {
    setStatus("saving");
    try {
      const res = await fetch(`/hub/api/people/${person.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onRemove(person.id);
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2">
      <input
        aria-label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onBlur={() => {
          const trimmed = name.trim();
          if (trimmed && trimmed !== person.name) patch({ name: trimmed });
          else setName(person.name);
        }}
        className="h-11 min-w-0 flex-1 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
      />
      <select
        aria-label="Relationship"
        value={person.relationship}
        onChange={(e) => patch({ relationship: e.target.value as Relationship })}
        className="h-11 shrink-0 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
      >
        {RELATIONSHIP_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label="Decrease cadence days"
          onClick={() => patch({ cadenceDays: Math.max(1, person.cadenceDays - 1) })}
          className="hub-press flex h-11 w-8 items-center justify-center text-[18px] font-semibold text-tint"
        >
          −
        </button>
        <span className="hub-tabular w-[72px] text-center text-[13px] text-ink-2">every {person.cadenceDays}d</span>
        <button
          type="button"
          aria-label="Increase cadence days"
          onClick={() => patch({ cadenceDays: Math.min(365, person.cadenceDays + 1) })}
          className="hub-press flex h-11 w-8 items-center justify-center text-[18px] font-semibold text-tint"
        >
          +
        </button>
      </div>
      <span className="w-12 shrink-0 text-[12px] font-medium" aria-live="polite">
        {status === "saving" ? <span className="text-ink-3">…</span> : null}
        {status === "saved" ? <span className="text-good">Saved</span> : null}
        {status === "error" ? <span className="text-bad">Error</span> : null}
      </span>
      <button
        type="button"
        aria-label={`Delete ${person.name}`}
        onClick={remove}
        className="hub-press shrink-0 text-[13px] font-semibold text-bad"
      >
        Delete
      </button>
    </div>
  );
}

function AddPersonRow({ onAdd }: { onAdd: (p: Person) => void }) {
  const [name, setName] = useState("");
  const [relationship, setRelationship] = useState<Relationship>("friend");
  const [cadenceDays, setCadenceDays] = useState(21);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function add() {
    const trimmed = name.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/hub/api/people", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, relationship, cadenceDays }),
      });
      const data: { person?: Person; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !data.person) throw new Error(data.error ?? "Could not add person");
      onAdd({
        id: data.person.id,
        name: data.person.name,
        relationship: data.person.relationship,
        cadenceDays: data.person.cadenceDays,
      });
      setName("");
      setRelationship("friend");
      setCadenceDays(21);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add person");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-2 px-3 py-2">
      <div className="flex flex-wrap items-center gap-2">
        <input
          aria-label="New person's name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder="Name"
          className="h-11 min-w-0 flex-1 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
        />
        <select
          aria-label="Relationship"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as Relationship)}
          className="h-11 shrink-0 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
        >
          {RELATIONSHIP_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            aria-label="Decrease cadence days"
            onClick={() => setCadenceDays((d) => Math.max(1, d - 1))}
            className="hub-press flex h-11 w-8 items-center justify-center text-[18px] font-semibold text-tint"
          >
            −
          </button>
          <span className="hub-tabular w-[72px] text-center text-[13px] text-ink-2">every {cadenceDays}d</span>
          <button
            type="button"
            aria-label="Increase cadence days"
            onClick={() => setCadenceDays((d) => Math.min(365, d + 1))}
            className="hub-press flex h-11 w-8 items-center justify-center text-[18px] font-semibold text-tint"
          >
            +
          </button>
        </div>
        <button
          type="button"
          onClick={add}
          disabled={busy || !name.trim()}
          className="hub-press shrink-0 rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-page disabled:opacity-40"
        >
          Add
        </button>
      </div>
      {error ? <p className="text-[13px] text-bad">{error}</p> : null}
    </div>
  );
}

export function PeopleSection({ initial, dbConnected }: { initial: Person[]; dbConnected: boolean }) {
  const [rows, setRows] = useState<Person[]>(initial);

  if (!dbConnected) {
    return (
      <SettingsCard title="People">
        <p className="text-[15px] text-ink-2">Connect the database to manage people</p>
      </SettingsCard>
    );
  }

  return (
    <SettingsCard title="People">
      <InsetList>
        {rows.map((p) => (
          <PersonRow
            key={p.id}
            person={p}
            onChange={(next) => setRows((rs) => sortByName(rs.map((r) => (r.id === next.id ? next : r))))}
            onRemove={(id) => setRows((rs) => rs.filter((r) => r.id !== id))}
          />
        ))}
        <AddPersonRow onAdd={(p) => setRows((rs) => sortByName([...rs, p]))} />
      </InsetList>
    </SettingsCard>
  );
}

/* ------------------------------- Aliveness list ------------------------------- */

export function AlivenessListSection({
  initial,
  dbConnected,
}: {
  initial: Settings["aliveness"];
  dbConnected: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const [newItem, setNewItem] = useState("");
  const { status, error, save } = useSectionSave("aliveness", dbConnected);

  function addItem() {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    setDraft((d) => ({ ...d, list: [...d.list, trimmed] }));
    setNewItem("");
  }

  return (
    <SettingsCard title="Aliveness list" hint="Things you love doing — used for suggestions">
      <InsetList>
        {draft.list.map((item, i) => (
          <TextRow
            key={`${item}-${i}`}
            removeLabel={`Remove ${item}`}
            onRemove={() => setDraft((d) => ({ ...d, list: d.list.filter((_, idx) => idx !== i) }))}
          >
            {item}
          </TextRow>
        ))}
        <div className="flex items-center gap-2 px-3 py-2">
          <input
            value={newItem}
            onChange={(e) => setNewItem(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addItem();
              }
            }}
            placeholder="Add an activity"
            className="h-11 min-w-0 flex-1 rounded-control border border-hairline bg-elevated px-2 text-[15px]"
          />
          <button
            type="button"
            onClick={addItem}
            disabled={!newItem.trim()}
            className="hub-press shrink-0 rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-page disabled:opacity-40"
          >
            Add
          </button>
        </div>
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* -------------------------------- Notifications -------------------------------- */

export function NotificationsSection({
  initial,
  dbConnected,
}: {
  initial: Settings["notifications"];
  dbConnected: boolean;
}) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("notifications", dbConnected);

  return (
    <SettingsCard title="Notifications">
      <InsetList>
        <Switch label="Push notifications" checked={draft.push} onChange={(v) => setDraft((d) => ({ ...d, push: v }))} />
        <Switch label="Slack notifications" checked={draft.slack} onChange={(v) => setDraft((d) => ({ ...d, slack: v }))} />
        <Switch label="Quiet week" checked={draft.quietWeek} onChange={(v) => setDraft((d) => ({ ...d, quietWeek: v }))} />
        <Switch
          label="Bedtime reminder"
          checked={draft.bedtimeReminder}
          onChange={(v) => setDraft((d) => ({ ...d, bedtimeReminder: v }))}
        />
        <Switch
          label="Rating prompts"
          checked={draft.ratingPrompts}
          onChange={(v) => setDraft((d) => ({ ...d, ratingPrompts: v }))}
        />
      </InsetList>
      <InsetList>
        <TimeField label="Quiet hours start" value={draft.quietStart} onChange={(v) => setDraft((d) => ({ ...d, quietStart: v }))} />
        <TimeField label="Quiet hours end" value={draft.quietEnd} onChange={(v) => setDraft((d) => ({ ...d, quietEnd: v }))} />
        <TimeField label="Daily brief time" value={draft.briefTime} onChange={(v) => setDraft((d) => ({ ...d, briefTime: v }))} />
        <TimeField label="Evening review time" value={draft.reviewTime} onChange={(v) => setDraft((d) => ({ ...d, reviewTime: v }))} />
      </InsetList>
      <InsetList>
        <Stepper
          label="Daily notification cap"
          value={draft.dailyCap}
          min={0}
          max={10}
          onChange={(v) => setDraft((d) => ({ ...d, dailyCap: v }))}
        />
        <Stepper
          label="Bedtime reminder lead time"
          hint="Minutes"
          value={draft.bedtimeLeadMin}
          min={0}
          max={120}
          step={5}
          onChange={(v) => setDraft((d) => ({ ...d, bedtimeLeadMin: v }))}
        />
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* --------------------------------- Work hours --------------------------------- */

export function WorkHoursSection({ initial, dbConnected }: { initial: Settings["workHours"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("workHours", dbConnected);

  return (
    <SettingsCard title="Work hours">
      <InsetList>
        <TimeField label="Start" value={draft.start} onChange={(v) => setDraft((d) => ({ ...d, start: v }))} />
        <TimeField label="End" value={draft.end} onChange={(v) => setDraft((d) => ({ ...d, end: v }))} />
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}

/* ----------------------------------- Cups ----------------------------------- */

export function CupsSection({ initial, dbConnected }: { initial: Settings["cups"]; dbConnected: boolean }) {
  const [draft, setDraft] = useState(initial);
  const { status, error, save } = useSectionSave("cups", dbConnected);

  return (
    <SettingsCard title="Cups" hint="Weights grid arrives with the cups">
      <InsetList>
        <Stepper
          label="Capacity"
          value={draft.capacity}
          min={4}
          max={20}
          onChange={(v) => setDraft((d) => ({ ...d, capacity: v }))}
        />
      </InsetList>
      <SaveBar status={status} error={error} disabled={!dbConnected} onSave={() => save(draft)} />
    </SettingsCard>
  );
}
