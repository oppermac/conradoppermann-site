"use client";

import { useState } from "react";
import { LogSheet, type LogPanel } from "../../components/sheet/LogSheet";

export function LogInline({ initial = "menu" }: { initial?: LogPanel }) {
  const [panel, setPanel] = useState<LogPanel>(initial);
  return (
    <div className="hub-card p-5">
      <LogSheet panel={panel} setPanel={setPanel} inline />
    </div>
  );
}
