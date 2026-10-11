"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="hub-press print:hidden flex h-9 items-center gap-2 rounded-full border border-hairline px-3.5 text-[13px] font-semibold text-ink-2"
    >
      <Printer size={16} aria-hidden />
      Print
    </button>
  );
}
