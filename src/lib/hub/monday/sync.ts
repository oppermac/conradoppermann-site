import { eq } from "drizzle-orm";
import { db } from "../db/client";
import { mondaySnapshots } from "../db/schema";
import { monday } from "./client";

export const ROADMAP_BOARD_ID = "5103365363";
const GROUPS: Record<string, "goals" | "rocks" | "issues"> = {
  group_mm6schae: "goals",
  group_mm6sdp: "rocks",
  group_mm6sqwhm: "issues",
};
const STATUS_COL = "color_mm6sh6d";
const OWNER_COL = "multiple_person_mm6stqca";

type RawCol = { id: string; type: string; text: string | null; value: string | null };
type RawSub = { id: string; name: string; column_values: RawCol[] };
type RawItem = { id: string; name: string; group?: { id: string; title: string } | null; column_values: RawCol[]; subitems?: RawSub[] | null; updated_at?: string };
type Page = { cursor: string | null; items: RawItem[] };

export type MondayStatus = "Done" | "In Progress" | "Stuck" | "Not Started" | string;
export type MondayItem = {
  id: string;
  name: string;
  group: "goals" | "rocks" | "issues";
  groupTitle: string;
  status: MondayStatus;
  owners: string[];
  subitems: Array<{ id: string; name: string; status: string | null; date: string | null }>;
  url: string;
  updatedAt: string | null;
};
export type MondaySummary = Record<"goals" | "rocks", { done: number; inProgress: number; stuck: number; notStarted: number; total: number }>;

const ITEM_FIELDS = `id name updated_at group { id title }
  column_values(ids: ["${STATUS_COL}", "${OWNER_COL}"]) { id type text value }
  subitems { id name column_values { id type text value } }`;

export async function fetchRoadmap(): Promise<MondayItem[]> {
  const first = await monday<{ boards: Array<{ items_page: Page }> }>(
    `query($boardId: ID!) { boards(ids: [$boardId]) { items_page(limit: 100) { cursor items { ${ITEM_FIELDS} } } } }`,
    { boardId: ROADMAP_BOARD_ID },
  );
  const page = first.boards[0]?.items_page;
  if (!page) throw new Error(`Board ${ROADMAP_BOARD_ID} not found`);
  const items = [...page.items];
  let cursor = page.cursor;
  while (cursor) {
    const next = await monday<{ next_items_page: Page }>(
      `query($cursor: String!) { next_items_page(limit: 100, cursor: $cursor) { cursor items { ${ITEM_FIELDS} } } }`,
      { cursor },
    );
    items.push(...next.next_items_page.items);
    cursor = next.next_items_page.cursor;
  }
  return items
    .filter((i) => i.group && GROUPS[i.group.id] && GROUPS[i.group.id] !== "issues")
    .map((i) => {
      const status = i.column_values.find((c) => c.id === STATUS_COL)?.text ?? "Not Started";
      const ownersText = i.column_values.find((c) => c.id === OWNER_COL)?.text ?? "";
      return {
        id: i.id,
        name: i.name,
        group: GROUPS[i.group!.id],
        groupTitle: i.group!.title,
        status,
        owners: ownersText ? ownersText.split(",").map((s) => s.trim()).filter(Boolean) : [],
        subitems: (i.subitems ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          status: s.column_values.find((c) => c.type === "status")?.text ?? null,
          date: s.column_values.find((c) => c.type === "date")?.text ?? null,
        })),
        url: `https://mavericksocial.monday.com/boards/${ROADMAP_BOARD_ID}/pulses/${i.id}`,
        updatedAt: i.updated_at ?? null,
      };
    });
}

export function summarise(items: MondayItem[]): MondaySummary {
  const empty = () => ({ done: 0, inProgress: 0, stuck: 0, notStarted: 0, total: 0 });
  const out: MondaySummary = { goals: empty(), rocks: empty() };
  for (const it of items) {
    if (it.group === "issues") continue;
    const s = out[it.group];
    s.total += 1;
    if (it.status === "Done") s.done += 1;
    else if (it.status === "In Progress") s.inProgress += 1;
    else if (it.status === "Stuck") s.stuck += 1;
    else s.notStarted += 1;
  }
  return out;
}

export async function syncMonday(): Promise<{ items: number; summary: MondaySummary }> {
  const items = await fetchRoadmap();
  const summary = summarise(items);
  await db
    .insert(mondaySnapshots)
    .values({ boardId: ROADMAP_BOARD_ID, fetchedAt: new Date(), items, summary })
    .onConflictDoUpdate({ target: mondaySnapshots.boardId, set: { fetchedAt: new Date(), items, summary } });
  return { items: items.length, summary };
}

export async function readRoadmap(): Promise<{ fetchedAt: Date; items: MondayItem[]; summary: MondaySummary } | null> {
  const [row] = await db.select().from(mondaySnapshots).where(eq(mondaySnapshots.boardId, ROADMAP_BOARD_ID)).limit(1);
  if (!row) return null;
  return { fetchedAt: row.fetchedAt, items: row.items as MondayItem[], summary: row.summary as MondaySummary };
}
