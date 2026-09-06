"use client";

import { AnimatePresence, animate, motion, useMotionValue, useReducedMotion, useTransform, type PanInfo } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";

/** Apple's momentum projection (Designing Fluid Interfaces). */
export function project(velocity: number, deceleration = 0.998): number {
  return ((velocity / 1000) * deceleration) / (1 - deceleration);
}

const TOP_FRACTION = 0.92;
const MID_FRACTION = 0.52;

/**
 * Bottom sheet with two detents. Tracks the finger 1:1 (framer keeps the grab offset), rubber-bands past the
 * top, projects momentum on release to pick a detent, dismisses on a firm flick, and hands the release velocity
 * to the spring — the only bounce in the app. Pushes the page back when at the top detent.
 */
export function Sheet({ open, onClose, children, label = "Log" }: { open: boolean; onClose: () => void; children: React.ReactNode; label?: string }) {
  const reduce = useReducedMotion();
  const y = useMotionValue(0);
  const [vh, setVh] = useState(800);
  const sheetRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);

  const dismissY = vh * TOP_FRACTION;
  const midY = vh * (TOP_FRACTION - MID_FRACTION);
  const scrimOpacity = useTransform(y, [0, dismissY], [1, 0]);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    queueMicrotask(update);
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const settle = useCallback(
    (target: number, velocity = 0) =>
      animate(y, target, reduce ? { duration: 0.2, ease: "easeOut" } : { type: "spring", visualDuration: 0.3, bounce: 0.2, velocity }),
    [y, reduce],
  );

  // Open: arrive from the bottom to the mid detent.
  useEffect(() => {
    if (!open) return;
    closingRef.current = false;
    y.set(dismissY);
    const controls = settle(midY);
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const close = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    onClose();
  }, [onClose]);

  // Back gesture closes the sheet.
  useEffect(() => {
    if (!open) return;
    const onPop = () => close();
    window.history.pushState({ hubSheet: true }, "", "?sheet=log");
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      if (window.history.state?.hubSheet) window.history.back();
    };
  }, [open, close]);

  // Escape closes; focus moves into the sheet.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    const first = sheetRef.current?.querySelector<HTMLElement>("button, [href], input, textarea, select");
    first?.focus({ preventScroll: true });
    return () => window.removeEventListener("keydown", onKey);
  }, [open, close]);

  // Push the page back when the sheet reaches the top detent.
  useEffect(() => {
    if (reduce) return;
    const page = document.getElementById("hub-page");
    if (!page) return;
    const unsub = y.on("change", (v) => {
      const t = Math.max(0, Math.min(1, 1 - v / (midY || 1)));
      page.style.transform = `scale(${1 - 0.06 * t}) translateY(${-8 * t}px)`;
      page.style.borderRadius = `${12 * t}px`;
      page.style.transformOrigin = "center top";
      page.style.transition = "none";
    });
    return () => {
      unsub();
      page.style.transform = "";
      page.style.borderRadius = "";
    };
  }, [y, midY, reduce]);

  function onDragEnd(_: unknown, info: PanInfo) {
    const current = y.get();
    const v = info.velocity.y;
    const projected = current + project(v);
    if (v > 900 || projected > dismissY * 0.6 + midY * 0.4) {
      settle(dismissY, v);
      close();
      return;
    }
    const target = Math.abs(projected - 0) < Math.abs(projected - midY) ? 0 : midY;
    settle(target, v);
  }

  return (
    <AnimatePresence>
      {open ? (
        <>
          <motion.div
            key="scrim"
            className="fixed inset-0 z-40"
            style={{ background: "var(--hub-scrim)", opacity: scrimOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.2 } }}
            onClick={close}
            aria-hidden
          />
          <motion.div
            key="sheet"
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            className="fixed inset-x-0 bottom-0 z-50 mx-auto w-full max-w-[640px] overflow-hidden rounded-t-[18px] bg-elevated shadow-[0_-8px_40px_rgba(0,0,0,0.18)]"
            style={{ y, height: vh * TOP_FRACTION, touchAction: "none" }}
            drag="y"
            dragConstraints={{ top: 0, bottom: dismissY }}
            dragElastic={{ top: 0.18, bottom: 0 }}
            dragMomentum={false}
            onDragEnd={onDragEnd}
            exit={{ y: dismissY, transition: reduce ? { duration: 0.2 } : { type: "spring", visualDuration: 0.3, bounce: 0 } }}
          >
            <div className="flex justify-center pt-2 pb-1">
              <div className="h-[5px] w-9 rounded-full bg-ink/25" aria-hidden />
            </div>
            <div className="h-[calc(100%-20px)] overflow-y-auto px-4" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 16px)", touchAction: "pan-y" }}>
              {children}
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}
