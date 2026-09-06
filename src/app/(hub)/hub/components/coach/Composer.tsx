"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Square } from "lucide-react";

const LINE_HEIGHT = 22;
const MAX_LINES = 6;
const PADDING = 20; // vertical padding inside the textarea

export function Composer({
  value,
  onChange,
  onSend,
  streaming,
  onStop,
  focusToken,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: (text: string) => void;
  streaming: boolean;
  onStop: () => void;
  /** Bump this number to (re)focus the textarea, e.g. after a suggestion seeds the composer. */
  focusToken?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setIsTouch(typeof navigator !== "undefined" && navigator.maxTouchPoints > 0));
  }, []);

  useEffect(() => {
    if (!focusToken) return;
    const el = ref.current;
    if (!el) return;
    el.focus();
    el.setSelectionRange(el.value.length, el.value.length);
  }, [focusToken]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    const max = LINE_HEIGHT * MAX_LINES + PADDING;
    const min = LINE_HEIGHT + PADDING;
    el.style.height = `${Math.min(max, Math.max(min, el.scrollHeight))}px`;
  }, [value]);

  function submit() {
    const trimmed = value.trim();
    if (!trimmed || streaming) return;
    onSend(trimmed);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== "Enter" || e.shiftKey || isTouch) return;
    e.preventDefault();
    submit();
  }

  return (
    <div
      className="hub-chrome sticky bottom-[calc(var(--tabbar-h)+var(--sab))] z-30 -mx-4 border-t border-hairline px-4 py-2.5 lg:sticky lg:bottom-0 lg:mx-0 lg:rounded-tile lg:border lg:px-3 lg:py-2.5"
      style={{ paddingBottom: "calc(0.625rem + var(--sab))" }}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          rows={1}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask the coach…"
          aria-label="Message the coach"
          className="max-h-[152px] min-h-11 flex-1 resize-none rounded-control border border-hairline bg-elevated px-3 py-2.5 text-[16px] leading-[22px] outline-none focus:border-tint"
        />
        {streaming ? (
          <button
            type="button"
            onClick={onStop}
            aria-label="Stop"
            className="hub-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-page"
          >
            <Square size={15} fill="currentColor" aria-hidden />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim()}
            aria-label="Send"
            className="hub-press flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-tint text-white disabled:opacity-30"
          >
            <ArrowUp size={18} strokeWidth={2.4} aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
