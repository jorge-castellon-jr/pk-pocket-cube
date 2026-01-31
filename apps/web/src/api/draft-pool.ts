import { client } from "../utils/hono-client";
import type { TCGdexCardWithSet } from "./tcgdex";

export type DraftPoolExclusion = {
  cardId: string;
  scope: "evolution" | "shop" | "both";
};

export type DraftPoolResponse = {
  picks: TCGdexCardWithSet[];
  evolutionsByPick: Record<string, TCGdexCardWithSet[]>;
  shopByPick: Record<string, TCGdexCardWithSet[]>;
  exclusions: DraftPoolExclusion[];
  isEditor: boolean;
};

export async function fetchDraftPool(): Promise<DraftPoolResponse> {
  const res = await client["draft-pool"].$get();
  if (!res.ok) {
    throw new Error(`Draft pool fetch failed: ${res.status}`);
  }
  return res.json();
}

export async function updateDraftPoolPicks(cardIds: string[]) {
  const res = await client["draft-pool"].picks.$put({
    json: { cardIds },
  });
  if (!res.ok) {
    throw new Error(`Draft pool picks update failed: ${res.status}`);
  }
  return res.json();
}

export async function updateDraftPoolExclusions(exclusions: DraftPoolExclusion[]) {
  const res = await client["draft-pool"].exclusions.$put({
    json: { exclusions },
  });
  if (!res.ok) {
    throw new Error(`Draft pool exclusions update failed: ${res.status}`);
  }
  return res.json();
}
