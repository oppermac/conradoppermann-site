"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

type PermState = "default" | "granted" | "denied" | "unsupported";
type SubState = "unknown" | "subscribed" | "unsubscribed";
type Busy = "enable" | "disable" | "test" | null;

function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, "+").replace(/_/g, "/"));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Enable/disable/test push notifications. All the subscribe work happens inside the tap handler, as required by Safari. */
export function PushToggle() {
  const [permission, setPermission] = useState<PermState>("default");
  const [sub, setSub] = useState<SubState>("unknown");
  const [busy, setBusy] = useState<Busy>(null);
  const [result, setResult] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      queueMicrotask(() => setPermission("unsupported"));
      return;
    }
    queueMicrotask(() => setPermission(Notification.permission as PermState));
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((s) => setSub(s ? "subscribed" : "unsubscribed"))
      .catch(() => setSub("unsubscribed"));
  }, []);

  async function enable() {
    setBusy("enable");
    setResult(null);
    try {
      const permissionResult = await Notification.requestPermission();
      setPermission(permissionResult as PermState);
      if (permissionResult !== "granted") {
        setResult("Notifications weren't allowed.");
        return;
      }
      const key = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!key) {
        setResult("Push isn't configured yet.");
        return;
      }
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(key) });
      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) throw new Error("The subscription came back incomplete");
      const res = await fetch("/hub/api/push/subscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, keys: { p256dh: json.keys.p256dh, auth: json.keys.auth } }),
      });
      const data: { error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      setSub("subscribed");
      setResult("Notifications are on.");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Couldn't enable notifications.");
    } finally {
      setBusy(null);
    }
  }

  async function disable() {
    setBusy("disable");
    setResult(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const subscription = await reg.pushManager.getSubscription();
      if (subscription) {
        await fetch("/hub/api/push/subscribe", {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setSub("unsubscribed");
      setResult("Notifications are off.");
    } catch {
      setResult("Couldn't turn off notifications.");
    } finally {
      setBusy(null);
    }
  }

  async function test() {
    setBusy("test");
    setResult(null);
    try {
      const res = await fetch("/hub/api/push/test", { method: "POST" });
      const data: { sent?: number; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "The test didn't send");
      setResult(data.sent ? `Sent to ${data.sent} device${data.sent === 1 ? "" : "s"}.` : "No active subscription to send to.");
    } catch (err) {
      setResult(err instanceof Error ? err.message : "Couldn't send a test notification.");
    } finally {
      setBusy(null);
    }
  }

  if (permission === "unsupported") {
    return <p className="px-3 py-2 text-[15px] text-ink-2">This browser doesn’t support push notifications.</p>;
  }

  const chip =
    permission === "denied" ? (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-bad">
        <BellOff size={14} aria-hidden /> Blocked in browser settings
      </span>
    ) : sub === "subscribed" ? (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-good">
        <BellRing size={14} aria-hidden /> Notifications on
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-3">
        <Bell size={14} aria-hidden /> Notifications off
      </span>
    );

  return (
    <div className="flex flex-col gap-2">
      <div className="flex min-h-11 items-center justify-between gap-3 px-3 py-2">
        <div className="text-[15px]">Push notifications</div>
        {chip}
      </div>
      <div className="flex flex-wrap items-center gap-2 px-3 pb-1">
        {sub === "subscribed" ? (
          <button
            type="button"
            onClick={disable}
            disabled={busy !== null}
            className="hub-press h-11 rounded-full border border-hairline px-4 text-[15px] font-semibold text-bad disabled:opacity-40"
          >
            {busy === "disable" ? "Turning off…" : "Turn off"}
          </button>
        ) : (
          <button
            type="button"
            onClick={enable}
            disabled={busy !== null || permission === "denied"}
            className="hub-press h-11 rounded-full bg-ink px-4 text-[15px] font-semibold text-page disabled:opacity-40"
          >
            {busy === "enable" ? "Enabling…" : "Enable notifications"}
          </button>
        )}
        <button
          type="button"
          onClick={test}
          disabled={busy !== null || sub !== "subscribed"}
          className="hub-press h-11 rounded-full border border-hairline px-4 text-[15px] font-semibold disabled:opacity-40"
        >
          {busy === "test" ? "Sending…" : "Send test"}
        </button>
      </div>
      {result ? <p className="px-3 text-[13px] text-ink-2">{result}</p> : null}
    </div>
  );
}
