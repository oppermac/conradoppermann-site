"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/hub/sw.js", { scope: "/hub/" }).catch(() => {
      /* registration is best-effort; the hub works without it */
    });
  }, []);
  return null;
}
