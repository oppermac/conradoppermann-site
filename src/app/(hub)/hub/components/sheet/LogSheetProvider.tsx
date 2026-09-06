"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Sheet } from "./Sheet";
import { LogSheet, type LogPanel } from "./LogSheet";

type Ctx = { panel: LogPanel | null; open: (panel?: LogPanel) => void; close: () => void };
const LogSheetContext = createContext<Ctx>({ panel: null, open: () => {}, close: () => {} });

export function useLogSheet(): Ctx {
  return useContext(LogSheetContext);
}

export function LogSheetProvider({ children }: { children: React.ReactNode }) {
  const [panel, setPanel] = useState<LogPanel | null>(null);
  const open = useCallback((p: LogPanel = "menu") => setPanel(p), []);
  const close = useCallback(() => setPanel(null), []);
  const value = useMemo(() => ({ panel, open, close }), [panel, open, close]);
  return (
    <LogSheetContext.Provider value={value}>
      {children}
      <Sheet open={panel !== null} onClose={close}>
        {panel ? <LogSheet panel={panel} setPanel={setPanel} onDone={close} /> : null}
      </Sheet>
    </LogSheetContext.Provider>
  );
}
