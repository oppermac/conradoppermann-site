"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect } from "react";

export type ToastState = { message: string; undo?: () => Promise<void> | void } | null;

/** "Logged · Undo" for five seconds. Lives at the bottom of whatever panel created it. */
export function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const reduce = useReducedMotion();
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);
  return (
    <AnimatePresence>
      {toast ? (
        <motion.div
          role="status"
          aria-live="polite"
          initial={{ opacity: 0, y: reduce ? 0 : 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reduce ? 0 : 8 }}
          transition={reduce ? { duration: 0.2 } : { type: "spring", visualDuration: 0.35, bounce: 0 }}
          className="hub-elevated mt-3 flex items-center justify-between gap-3 px-4 py-3 text-[15px]"
        >
          <span className="font-semibold">{toast.message}</span>
          {toast.undo ? (
            <button
              type="button"
              className="hub-press text-[15px] font-semibold text-tint"
              onClick={async () => {
                await toast.undo?.();
                onDismiss();
              }}
            >
              Undo
            </button>
          ) : null}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
