import { Sidebar } from "./Sidebar";
import { TabBar } from "./TabBar";
import { LogSheetProvider } from "./sheet/LogSheetProvider";

export function HubShell({ children }: { children: React.ReactNode }) {
  return (
    <LogSheetProvider>
      <div className="min-h-dvh lg:grid lg:grid-cols-[240px_1fr]">
      <Sidebar />
      <div
        id="hub-page"
        className="min-w-0 lg:pb-0"
        style={{ paddingBottom: "calc(var(--tabbar-h) + var(--sab) + 1rem)" }}
      >
        <main
          className="mx-auto w-full max-w-[1120px] px-4 pb-8 lg:px-8 lg:pt-8"
          style={{ paddingTop: "calc(var(--sat) + 0.75rem)" }}
        >
          {children}
        </main>
      </div>
      <TabBar />
      </div>
    </LogSheetProvider>
  );
}
