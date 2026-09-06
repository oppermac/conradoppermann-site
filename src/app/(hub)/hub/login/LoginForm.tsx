"use client";

import { useState } from "react";

export function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/hub/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        window.location.href = next;
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(data.error ?? "Couldn't sign in.");
      setBusy(false);
    } catch {
      setError("Couldn't reach the hub. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="hub-card flex flex-col gap-3 p-5" aria-describedby={error ? "login-error" : undefined}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-semibold text-ink-2">Password</span>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="h-11 rounded-control border border-hairline bg-elevated px-3 text-[17px] outline-none focus:border-tint"
        />
      </label>
      {error ? (
        <p id="login-error" role="alert" className="text-[13px] text-bad">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={busy || password.length === 0}
        className="hub-press h-11 rounded-full bg-ink text-[15px] font-semibold text-page disabled:opacity-50"
      >
        {busy ? "Signing in…" : "Continue"}
      </button>
    </form>
  );
}
