import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  CalendarRange,
  Flag,
  HeartPulse,
  Plus,
  Settings,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";

export type NavItem = { href: string; label: string; icon: LucideIcon; primary?: boolean };

/** iPhone tab bar: five slots, Log in the middle. */
export const TAB_ITEMS: NavItem[] = [
  { href: "/hub", label: "Today", icon: Sun },
  { href: "/hub/body", label: "Body", icon: HeartPulse },
  { href: "/hub/log", label: "Log", icon: Plus, primary: true },
  { href: "/hub/food", label: "Food", icon: Utensils },
  { href: "/hub/coach", label: "Coach", icon: Sparkles },
];

/** Desktop sidebar. */
export const SIDEBAR_ITEMS: NavItem[] = [
  { href: "/hub", label: "Today", icon: Sun },
  { href: "/hub/week", label: "Week", icon: CalendarDays },
  { href: "/hub/month", label: "Month", icon: CalendarRange },
  { href: "/hub/programme", label: "Programme", icon: Flag },
  { href: "/hub/body", label: "Body", icon: HeartPulse },
  { href: "/hub/food", label: "Food", icon: Utensils },
  { href: "/hub/coach", label: "Coach", icon: Sparkles },
];

export const SETTINGS_ITEM: NavItem = { href: "/hub/settings", label: "Settings", icon: Settings };

/** Today is active for Day/Week/Month scopes. */
export function isActive(pathname: string, href: string): boolean {
  if (href === "/hub") return pathname === "/hub" || pathname === "/hub/week" || pathname === "/hub/month";
  return pathname === href || pathname.startsWith(href + "/");
}
