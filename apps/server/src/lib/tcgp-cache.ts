import { eq } from "drizzle-orm";
import type { D1Database } from "@cloudflare/workers-types";
import { drizzle } from "drizzle-orm/d1";
import { tcgpCacheMeta, tcgpSet, tcgpCard } from "../db/tcgp-cache-schema";

const API_BASE = "https://api.tcgdex.net/v2/en";
const META_KEY = "status";
const SETS_CHUNK = 8;
const CARDS_CHUNK = 20;

export type CachePhase = "idle" | "sets" | "cards" | "done";

export type CacheStatus = {
  phase: CachePhase;
  sets: { total: number; cached: number; wantedIds: string[] };
  cards: { total: number; cached: number; wantedIds: string[] };
  lastError: string | null;
  updatedAt: string | null;
};

type MetaValue = {
  phase: CachePhase;
  setIds: string[];
  setIndex: number;
  cardIds: string[];
  cardIndex: number;
  lastError?: string;
  updatedAt?: string;
};

function getDb(d1: D1Database) {
  return drizzle(d1, {
    schema: { tcgpCacheMeta, tcgpSet, tcgpCard },
  });
}

export async function isCacheReady(db: D1Database): Promise<boolean> {
  const [row] = await getDb(db)
    .select()
    .from(tcgpCacheMeta)
    .where(eq(tcgpCacheMeta.key, META_KEY))
    .limit(1);
  if (!row) return false;
  const meta = JSON.parse(row.value) as MetaValue;
  return meta.phase === "done";
}

export async function getCachedSets(db: D1Database): Promise<Array<{ id: string; name: string; logo?: string; cardCount?: { total: number } }>> {
  const rows = await getDb(db).select().from(tcgpSet);
  return rows.map((r) => {
    const data = JSON.parse(r.data) as { id: string; name: string; logo?: string; cardCount?: { total: number } };
    return { id: data.id, name: data.name, logo: data.logo, cardCount: data.cardCount };
  });
}

export type CachedCardForList = {
  id: string;
  name: string;
  localId: string;
  image?: string;
  setId: string;
  setName: string;
  rarity?: string;
  types?: string[];
};

export async function getCachedCards(
  db: D1Database,
  options: { includeNoImage?: boolean } = {}
): Promise<CachedCardForList[]> {
  const rows = await getDb(db).select().from(tcgpCard);
  const setRows = await getDb(db).select().from(tcgpSet);
  const setIdToName = new Map<string, string>();
  const cardIdToSetId = new Map<string, string>();
  for (const r of setRows) {
    const data = JSON.parse(r.data) as { id: string; name: string; cards?: Array<{ id: string }> };
    setIdToName.set(data.id, data.name);
    for (const c of data.cards ?? []) cardIdToSetId.set(c.id, data.id);
  }
  const cards: CachedCardForList[] = [];
  for (const r of rows) {
    const data = JSON.parse(r.data) as {
      id: string;
      name: string;
      localId?: string;
      image?: string;
      set?: { id: string; name: string };
      rarity?: string;
      types?: string[];
    };
    if (!options.includeNoImage && !data.image) continue;
    const setId = data.set?.id ?? cardIdToSetId.get(data.id) ?? "";
    const setName = data.set?.name ?? setIdToName.get(setId) ?? "";
    cards.push({
      id: data.id,
      name: data.name,
      localId: data.localId ?? "",
      image: data.image,
      setId,
      setName,
      rarity: data.rarity,
      types: data.types,
    });
  }
  return cards;
}

export async function getCachedCardById(db: D1Database, id: string): Promise<Record<string, unknown> | null> {
  const [row] = await getDb(db).select().from(tcgpCard).where(eq(tcgpCard.id, id)).limit(1);
  if (!row) return null;
  return JSON.parse(row.data) as Record<string, unknown>;
}

export async function getCacheStatus(db: D1Database): Promise<CacheStatus> {
  const d = getDb(db);
  const [row] = await d
    .select()
    .from(tcgpCacheMeta)
    .where(eq(tcgpCacheMeta.key, META_KEY))
    .limit(1);

  const meta: MetaValue | null = row
    ? (JSON.parse(row.value) as MetaValue)
    : null;

  const setsCount = await d.select().from(tcgpSet);
  const cardsCount = await d.select().from(tcgpCard);

  const wantedSetIds = meta?.setIds ?? [];
  const wantedCardIds = meta?.cardIds ?? [];

  return {
    phase: meta?.phase ?? "idle",
    sets: {
      total: wantedSetIds.length,
      cached: setsCount.length,
      wantedIds: wantedSetIds,
    },
    cards: {
      total: wantedCardIds.length,
      cached: cardsCount.length,
      wantedIds: wantedCardIds,
    },
    lastError: meta?.lastError ?? null,
    updatedAt: meta?.updatedAt ?? null,
  };
}

export async function runCacheWarmChunk(db: D1Database): Promise<{
  status: CacheStatus;
  didWork: boolean;
  message: string;
}> {
  const d = getDb(db);
  const [row] = await d
    .select()
    .from(tcgpCacheMeta)
    .where(eq(tcgpCacheMeta.key, META_KEY))
    .limit(1);

  let meta: MetaValue = row
    ? (JSON.parse(row.value) as MetaValue)
    : {
        phase: "idle",
        setIds: [],
        setIndex: 0,
        cardIds: [],
        cardIndex: 0,
      };

  const now = new Date().toISOString();

  function saveMeta(m: MetaValue) {
    meta = m;
    meta.updatedAt = now;
    delete meta.lastError;
  }

  async function persistMeta() {
    await d
      .insert(tcgpCacheMeta)
      .values({
        key: META_KEY,
        value: JSON.stringify(meta),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: tcgpCacheMeta.key,
        set: {
          value: JSON.stringify(meta),
          updatedAt: new Date(),
        },
      });
  }

  try {
    if (meta.phase === "idle") {
      const res = await fetch(`${API_BASE}/series/tcgp`);
      if (!res.ok) throw new Error(`Series fetch failed: ${res.status}`);
      const series = (await res.json()) as { sets: Array<{ id: string; name: string }> };
      saveMeta({
        phase: "sets",
        setIds: series.sets.map((s) => s.id),
        setIndex: 0,
        cardIds: [],
        cardIndex: 0,
      });
      await persistMeta();
      const status = await getCacheStatus(db);
      return { status, didWork: true, message: "Fetched series; ready to warm sets." };
    }

    if (meta.phase === "sets") {
      const start = meta.setIndex;
      const end = Math.min(start + SETS_CHUNK, meta.setIds.length);
      if (start >= meta.setIds.length) {
        const allSets = await d.select().from(tcgpSet);
        const allCardIds = new Set<string>();
        for (const row of allSets) {
          const setData = JSON.parse(row.data) as { cards?: Array<{ id: string }> };
          for (const c of setData.cards ?? []) allCardIds.add(c.id);
        }
        saveMeta({
          ...meta,
          phase: "cards",
          cardIds: Array.from(allCardIds),
          cardIndex: 0,
        });
        await persistMeta();
        const status = await getCacheStatus(db);
        return { status, didWork: true, message: "Sets complete; ready to warm cards." };
      }

      const setIdBatch = meta.setIds.slice(start, end);
      const cardIdsAccum = [...meta.cardIds];

      for (const setId of setIdBatch) {
        const setRes = await fetch(`${API_BASE}/sets/${setId}`);
        if (!setRes.ok) continue;
        const setData = (await setRes.json()) as {
          id: string;
          name: string;
          logo?: string;
          cardCount?: { total: number };
          cards: Array<{ id: string }>;
        };
        const cardIds = setData.cards?.map((c) => c.id) ?? [];
        cardIdsAccum.push(...cardIds);
        await d
          .insert(tcgpSet)
          .values({
            id: setData.id,
            data: JSON.stringify(setData),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: tcgpSet.id,
            set: { data: JSON.stringify(setData), updatedAt: new Date() },
          });
      }

      const newSetIndex = end;
      const isDone = newSetIndex >= meta.setIds.length;
      const uniqueCardIds = Array.from(new Set(cardIdsAccum));
      saveMeta({
        ...meta,
        setIndex: newSetIndex,
        cardIds: uniqueCardIds,
        phase: isDone ? "cards" : "sets",
      });
      await persistMeta();
      const status = await getCacheStatus(db);
      return {
        status,
        didWork: true,
        message: `Warmed sets ${start + 1}-${end} of ${meta.setIds.length}.`,
      };
    }

    if (meta.phase === "cards") {
      const start = meta.cardIndex;
      const end = Math.min(start + CARDS_CHUNK, meta.cardIds.length);
      if (start >= meta.cardIds.length) {
        saveMeta({ ...meta, phase: "done" });
        await persistMeta();
        const status = await getCacheStatus(db);
        return { status, didWork: true, message: "Cache warming complete." };
      }

      const cardIdBatch = meta.cardIds.slice(start, end);
      for (const cardId of cardIdBatch) {
        const cardRes = await fetch(`${API_BASE}/cards/${cardId}`);
        if (!cardRes.ok) continue;
        const cardData = (await cardRes.json()) as Record<string, unknown>;
        await d
          .insert(tcgpCard)
          .values({
            id: cardId,
            data: JSON.stringify(cardData),
            updatedAt: new Date(),
          })
          .onConflictDoUpdate({
            target: tcgpCard.id,
            set: { data: JSON.stringify(cardData), updatedAt: new Date() },
          });
      }

      const newCardIndex = end;
      const isDone = newCardIndex >= meta.cardIds.length;
      saveMeta({
        ...meta,
        cardIndex: newCardIndex,
        phase: isDone ? "done" : "cards",
      });
      await persistMeta();
      const status = await getCacheStatus(db);
      return {
        status,
        didWork: true,
        message: `Warmed cards ${start + 1}-${end} of ${meta.cardIds.length}.`,
      };
    }

    const status = await getCacheStatus(db);
    return { status, didWork: false, message: "Cache already complete." };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    meta.lastError = message;
    meta.updatedAt = now;
    await persistMeta().catch(() => {});
    const status = await getCacheStatus(db);
    return {
      status: { ...status, lastError: message, updatedAt: now },
      didWork: false,
      message: `Error: ${message}`,
    };
  }
}
