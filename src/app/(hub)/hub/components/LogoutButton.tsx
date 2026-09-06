"use client";

import { useState } from "react";

export function LogoutButton() {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        await fetch("/hub/api/auth/logout", { method: "POST" });
        window.location.href = "/hub/login";
      }}
      className="hub-press rounded-full border border-hairline px-4 py-2 text-[15px] font-semibold text-bad disabled:opacity-50"
    >
      Sign out
    </button>
  );
}
