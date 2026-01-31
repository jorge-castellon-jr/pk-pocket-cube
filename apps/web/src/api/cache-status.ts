import { client } from "../utils/hono-client";

export type CachePhase = "idle" | "sets" | "cards" | "done";

export type CacheStatusResponse = {
  phase: CachePhase;
  sets: { total: number; cached: number; wantedIds: string[] };
  cards: { total: number; cached: number; wantedIds: string[] };
  lastError: string | null;
  updatedAt: string | null;
};

export async function fetchCacheStatus(): Promise<CacheStatusResponse> {
  const res = await client["tcg-pocket"]["cache-status"].$get();
  if (!res.ok) throw new Error("Failed to fetch cache status");
  return res.json();
}

export async function triggerCacheWarm(): Promise<{
  status: CacheStatusResponse;
  didWork: boolean;
  message: string;
}> {
  const res = await client["tcg-pocket"]["cache-warm"].$post();
  if (!res.ok) throw new Error("Failed to trigger cache warm");
  return res.json();
}
