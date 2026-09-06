"use client";

const PROMPTS = ["How am I doing?", "What's next?", "Plan my week", "Top up oxytocin", "What should I eat tonight?", "Review my week"];

/** One tap starts the conversation with that prompt. */
export function SuggestedPrompts({ onPick, disabled }: { onPick: (text: string) => void; disabled?: boolean }) {
  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-wrap lg:overflow-visible lg:px-0" role="group" aria-label="Suggested prompts">
      {PROMPTS.map((p) => (
        <button
          key={p}
          type="button"
          disabled={disabled}
          onClick={() => onPick(p)}
          className="hub-press hub-elevated shrink-0 whitespace-nowrap rounded-full px-4 py-2.5 text-[14px] font-semibold text-ink disabled:opacity-40"
        >
          {p}
        </button>
      ))}
    </div>
  );
}
