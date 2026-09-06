"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TAB_ITEMS, isActive } from "./nav";

export function TabBar() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Primary"
      className="hub-chrome fixed inset-x-0 bottom-0 z-40 border-t border-hairline lg:hidden"
      style={{ paddingBottom: "var(--sab)" }}
    >
      <ul className="grid h-[var(--tabbar-h)] grid-cols-5">
        {TAB_ITEMS.map((item) => {
          const active = isActive(pathname, item.href);
          const Icon = item.icon;
          if (item.primary) {
            return (
              <li key={item.href} className="flex items-center justify-center">
                <Link
                  href={item.href}
                  aria-label={item.label}
                  className="hub-press flex h-11 w-11 items-center justify-center rounded-full bg-tint text-white shadow-md"
                >
                  <Icon size={24} strokeWidth={2.4} aria-hidden />
                </Link>
              </li>
            );
          }
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`hub-press flex h-full flex-col items-center justify-center gap-0.5 ${
                  active ? "text-tint" : "text-ink-3"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.2 : 1.8} aria-hidden />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
