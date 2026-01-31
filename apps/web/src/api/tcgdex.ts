/**
 * TCGdex API client for Pokémon TCG Pocket (series: tcgp).
 * @see https://tcgdex.dev/tcg-pocket
 */

import { client } from "../utils/hono-client";

export interface TCGdexCardBrief {
  id: string;
  name: string;
  localId: string;
  image?: string;
}

export interface TCGdexCardWithSet extends TCGdexCardBrief {
  setId: string;
  setName: string;
  rarity?: string;
  types?: string[];
}

export interface TCGdexCardDetail extends TCGdexCardBrief {
  category?: string;
  illustrator?: string;
  rarity?: string;
  hp?: number;
  types?: string[];
  description?: string;
  stage?: string;
  evolvesFrom?: string;
  attacks?: Array<{
    cost?: string[];
    name?: string;
    damage?: string | number;
    effect?: string;
  }>;
  weaknesses?: Array<{ type: string; value?: string }>;
  retreat?: number;
  set?: {
    id: string;
    name: string;
    symbol?: string;
  };
  boosters?: Array<{ id: string; name: string }>;
}

export interface EvolutionData {
  evolvesFromName?: string | null;
  evolvesToNames?: string[];
  chainNames?: string[];
}

export interface TCGdexSetListItem {
  id: string;
  name: string;
  logo?: string;
  cardCount?: { total: number; official?: number };
}

/** Fetches all TCG Pocket cards (with rarity when served from app cache). */
export async function fetchAllTCGPocketCards(): Promise<TCGdexCardWithSet[]> {
  const res = await client["tcg-pocket"].cards.$get({
    query: { detail: "1" },
  });
  if (!res.ok) {
    throw new Error(`TCG Pocket API failed: ${res.status}`);
  }
  return (await res.json()) as TCGdexCardWithSet[];
}

export async function fetchAllTCGPocketCardsIncludingNoImage(): Promise<TCGdexCardWithSet[]> {
  const res = await client["tcg-pocket"].cards.$get({
    query: { detail: "1", includeNoImage: "1" },
  });
  if (!res.ok) {
    throw new Error(`TCG Pocket API failed: ${res.status}`);
  }
  return (await res.json()) as TCGdexCardWithSet[];
}

export async function fetchTCGPocketSets(): Promise<TCGdexSetListItem[]> {
  const res = await client["tcg-pocket"].sets.$get();
  if (!res.ok) {
    throw new Error(`TCG Pocket sets failed: ${res.status}`);
  }
  return res.json();
}

export async function fetchTCGPocketCardById(
  id: string
): Promise<TCGdexCardDetail> {
  const res = await client["tcg-pocket"].cards[":id"].$get({
    param: { id },
  });
  if (!res.ok) {
    throw new Error(`TCG Pocket card failed: ${res.status}`);
  }
  return res.json();
}

const TYPES_BATCH_SIZE = 25;

/** Fetch types for many cards in batches. Returns id -> lowercase type slugs. Used when list API omits types. */
export async function fetchTypesForCardIds(
  cardIds: string[]
): Promise<Record<string, string[]>> {
  const out: Record<string, string[]> = {};
  for (let i = 0; i < cardIds.length; i += TYPES_BATCH_SIZE) {
    const batch = cardIds.slice(i, i + TYPES_BATCH_SIZE);
    const details = await Promise.all(
      batch.map((id) =>
        fetchTCGPocketCardById(id).catch(() => null)
      )
    );
    for (let j = 0; j < batch.length; j++) {
      const d = details[j];
      const types = d?.types;
      out[batch[j]] = Array.isArray(types)
        ? types
            .map((x) => (typeof x === "string" ? x : (x as { name?: string }).name ?? ""))
            .filter(Boolean)
            .map((s) => s.toLowerCase())
        : [];
    }
  }
  return out;
}

export async function fetchEvolutionData(
  name: string
): Promise<EvolutionData> {
  const res = await client["tcg-pocket"].evolution[":name"].$get({
    param: { name },
  });
  if (!res.ok) {
    throw new Error(`Evolution lookup failed: ${res.status}`);
  }
  return res.json();
}

/** Card image URL; TCGdex uses base path + /{quality}.{extension}. */
export function getCardImageUrl(
  card: TCGdexCardBrief,
  size: "small" | "large" = "small",
  format: "webp" | "png" = "webp"
): string {
  if (!card.image) {
    return "https://placehold.co/245x337/1e1b4b/fff?text=No+Image";
  }
  const quality = size === "small" ? "low" : "high";
  const base = card.image.endsWith(".webp")
    ? card.image
    : `${card.image}/${quality}.${format}`;
  return base;
}
