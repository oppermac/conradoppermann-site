import { getAccessToken, markReauthRequired } from "../tokens";
import { refreshWhoopToken } from "./oauth";

const BASE = "https://api.prod.whoop.com/developer";

export type ScoreState = "SCORED" | "PENDING_SCORE" | "UNSCORABLE";

export type WhoopCycle = {
  id: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end?: string | null;
  timezone_offset: string;
  score_state: ScoreState;
  score?: { strain: number; kilojoule: number; average_heart_rate: number; max_heart_rate: number } | null;
};

export type WhoopRecovery = {
  cycle_id: number;
  sleep_id: string;
  user_id: number;
  created_at: string;
  updated_at: string;
  score_state: ScoreState;
  score?: {
    user_calibrating?: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage?: number;
    skin_temp_celsius?: number;
  } | null;
};

export type WhoopSleep = {
  id: string;
  v1_id?: number;
  cycle_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  nap: boolean;
  score_state: ScoreState;
  score?: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed?: {
      baseline_milli: number;
      need_from_sleep_debt_milli: number;
      need_from_recent_strain_milli: number;
      need_from_recent_nap_milli: number;
    };
    respiratory_rate?: number;
    sleep_performance_percentage?: number;
    sleep_consistency_percentage?: number;
    sleep_efficiency_percentage?: number;
  } | null;
};

export type WhoopWorkout = {
  id: string;
  v1_id?: number;
  user_id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_name?: string | null;
  sport_id?: number | null;
  score_state: ScoreState;
  score?: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded?: number;
    distance_meter?: number;
    altitude_gain_meter?: number;
    altitude_change_meter?: number;
    zone_durations?: Record<string, number>;
  } | null;
};

export type WhoopProfile = { user_id: number; email: string; first_name: string; last_name: string };
export type WhoopBody = { height_meter: number; weight_kilogram: number; max_heart_rate: number };

type Paged<T> = { records: T[]; next_token?: string | null };

export class WhoopApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, params: Record<string, string | number | undefined>, attempt = 0): Promise<T> {
  const token = await getAccessToken("whoop", refreshWhoopToken);
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { authorization: `Bearer ${token}` }, cache: "no-store" });
  if (res.status === 429 && attempt < 2) {
    const wait = Math.min(5000, Number(res.headers.get("retry-after") ?? 2) * 1000);
    await new Promise((r) => setTimeout(r, wait));
    return request<T>(path, params, attempt + 1);
  }
  if (res.status === 401) {
    await markReauthRequired("whoop");
    throw new WhoopApiError(401, "Whoop rejected the access token; reconnect Whoop in Settings");
  }
  if (!res.ok) throw new WhoopApiError(res.status, `Whoop ${path} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as T;
}

export async function whoopGet<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  return request<T>(path, params);
}

/** Follows next_token → nextToken until exhausted. */
export async function whoopPaginate<T>(
  path: string,
  params: Record<string, string | number | undefined> = {},
  maxPages = 40,
): Promise<T[]> {
  const out: T[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < maxPages; page++) {
    const data = await request<Paged<T>>(path, { limit: 25, ...params, nextToken });
    out.push(...(data.records ?? []));
    if (!data.next_token) break;
    nextToken = data.next_token;
  }
  return out;
}

export const whoopApi = {
  cycles: (start: string, end?: string) => whoopPaginate<WhoopCycle>("/v2/cycle", { start, end }),
  recoveries: (start: string, end?: string) => whoopPaginate<WhoopRecovery>("/v2/recovery", { start, end }),
  sleeps: (start: string, end?: string) => whoopPaginate<WhoopSleep>("/v2/activity/sleep", { start, end }),
  workouts: (start: string, end?: string) => whoopPaginate<WhoopWorkout>("/v2/activity/workout", { start, end }),
  sleep: (id: string) => whoopGet<WhoopSleep>(`/v2/activity/sleep/${id}`),
  workout: (id: string) => whoopGet<WhoopWorkout>(`/v2/activity/workout/${id}`),
  profile: () => whoopGet<WhoopProfile>("/v2/user/profile/basic"),
  body: () => whoopGet<WhoopBody>("/v2/user/measurement/body"),
};
