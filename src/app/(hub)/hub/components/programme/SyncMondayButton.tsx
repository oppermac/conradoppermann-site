"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SyncMondayButton() {
  const router = useRouter();
  const [state, setState] = useState<"idle" | "busy" | "done" | "error">("idle");
  return (
    <button
      type="button"
      disabled={state === "busy"}
      onClick={async () => {
        setState("busy");
        const res = await fetch("/hub/api/monday/sync", { method: "POST" });
        setState(res.ok ? "done" : "error");
        if (res.ok) router.refresh();
        setTimeout(() => setState("idle"), 2000);
      }}
      className="hub-press rounded-full border border-hairline px-3 py-1.5 text-[13px] font-semibold text-tint disabled:opacity-50"
    >
      {state === "busy" ? "Syncing…" : state === "done" ? "Synced" : state === "error" ? "Couldn’t sync" : "Sync now"}
    </button>
  );
}
