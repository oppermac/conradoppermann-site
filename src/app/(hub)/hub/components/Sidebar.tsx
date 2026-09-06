"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { SETTINGS_ITEM, SIDEBAR_ITEMS, isActive } from "./nav";
import { proximaNova } from "@/app/fonts";
import { useLogSheet } from "./sheet/LogSheetProvider";

export function Sidebar() {
  const pathname = usePathname();
  const { open } = useLogSheet();
  return (
    <aside className="hub-chrome sticky top-0 hidden h-dvh w-[240px] flex-col border-r border-hairline px-4 py-6 lg:flex">
      <div className="px-2">
        <div className={`${proximaNova.className} text-[15px] font-bold uppercase tracking-[0.3em] text-ink`}>
          Conrad
        </div>
        <div className="mt-0.5 text-[13px] text-ink-2">Hub</div>
      </div>
      <Link
        href="/hub/log"
        onClick={(e) => {
          e.preventDefault();
          open("menu");
        }}
        className="hub-press mt-6 flex items-center justify-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[15px] font-semibold text-page"
      >
        <Plus size={18} strokeWidth={2.4} aria-hidden />
        Log
      </Link>
      <nav aria-label="Sections" className="mt-6 flex flex-1 flex-col gap-1">
        {SIDEBAR_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`hub-press flex items-center gap-3 rounded-control px-3 py-2 text-[15px] ${
                active ? "bg-tint/12 font-semibold text-tint" : "text-ink-2 hover:bg-ink/5"
              }`}
            >
              <Icon size={18} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <Link
        href={SETTINGS_ITEM.href}
        aria-current={isActive(pathname, SETTINGS_ITEM.href) ? "page" : undefined}
        className="hub-press flex items-center gap-3 rounded-control px-3 py-2 text-[15px] text-ink-2 hover:bg-ink/5"
      >
        <SETTINGS_ITEM.icon size={18} strokeWidth={1.8} aria-hidden />
        Settings
      </Link>
    </aside>
  );
}
