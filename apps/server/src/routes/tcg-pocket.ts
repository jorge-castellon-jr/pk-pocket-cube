import { Hono } from "hono";
import type { HonoAppContext } from "../auth";
import type { Env } from "../env-types";
import {
  getCacheStatus,
  runCacheWarmChunk,
  isCacheReady,
  getCachedSets,
  getCachedCards,
  getCachedCardById,
} from "../lib/tcgp-cache";

const API_BASE = "https://api.tcgdex.net/v2/en";
const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const CACHE_TTL_SECONDS = 60 * 15;

type TCGPocketCard = {
  id: string;
  name: string;
  localId: string;
  image: string | undefined;
  setId: string;
  setName: string;
  rarity?: string;
};

type TCGPocketSeries = {
  sets: Array<{ id: string; name: string }>;
};

type TCGPocketSet = {
  id: string;
  name: string;
  logo?: string;
  cardCount?: { total: number; official?: number };
  cards: Array<{
    id: string;
    name: string;
    localId: string;
    image?: string;
  }>;
};

type EvolutionChainLink = {
  species: { name: string };
  evolves_to: EvolutionChainLink[];
};

type EvolutionChainResponse = {
  chain: EvolutionChainLink;
};

type PokemonSpeciesResponse = {
  evolution_chain: { url: string };
};

function normalizePokemonName(name: string) {
  return name
    .toLowerCase()
    .replace(/[\u2019']/g, "")
    .replace(/\./g, "")
    .replace(/\bex\b/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function findEvolutionNode(
  node: EvolutionChainLink,
  target: string
): EvolutionChainLink | null {
  if (node.species.name === target) return node;
  for (const child of node.evolves_to) {
    const found = findEvolutionNode(child, target);
    if (found) return found;
  }
  return null;
}

function findParentName(
  node: EvolutionChainLink,
  target: string,
  parent: string | null = null
): string | null {
  if (node.species.name === target) return parent;
  for (const child of node.evolves_to) {
    const found = findParentName(child, target, node.species.name);
    if (found) return found;
  }
  return null;
}

function collectChainNames(node: EvolutionChainLink, list: string[] = []) {
  list.push(node.species.name);
  if (node.evolves_to.length === 0) return list;
  node.evolves_to.forEach((child) => collectChainNames(child, list));
  return list;
}

export const tcgPocket = new Hono<HonoAppContext & { Bindings: Env }>()
  .get("/cache-status", async (c) => {
    const status = await getCacheStatus(c.env.DB);
    return c.json(status, 200);
  })
  .post("/cache-warm", async (c) => {
    const result = await runCacheWarmChunk(c.env.DB);
    return c.json(
      { status: result.status, didWork: result.didWork, message: result.message },
      200,
    );
  })
  .get("/cards", async (c) => {
    try {
      const includeNoImage = c.req.query("includeNoImage") === "1";

      const useDbCache = await isCacheReady(c.env.DB);
      if (useDbCache) {
        const cards = await getCachedCards(c.env.DB, { includeNoImage });
        const response = c.json(cards, 200);
        response.headers.set("Cache-Control", `public, max-age=${CACHE_TTL_SECONDS}`);
        return response;
      }

      const withoutDetailKey = new Request(
        `${API_BASE}/cache/tcgp/cards?detail=0&includeNoImage=${includeNoImage ? "1" : "0"}`
      );
      const cache = caches.default;
      const cached = await cache.match(withoutDetailKey);
      if (cached) {
        return cached;
      }
      const seriesRes = await fetch(`${API_BASE}/series/tcgp`);
      if (!seriesRes.ok) {
        throw new Error(`Series fetch failed: ${seriesRes.status}`);
      }
      const series = (await seriesRes.json()) as TCGPocketSeries;

      const sets = await Promise.all(
        series.sets.map(async (set) => {
          const setRes = await fetch(`${API_BASE}/sets/${set.id}`);
          if (!setRes.ok) return null;
          return (await setRes.json()) as TCGPocketSet;
        }),
      );

      const baseCards = sets
        .filter((set): set is TCGPocketSet => Boolean(set))
        .flatMap((set) =>
          set.cards
            .filter((card) => (includeNoImage ? true : Boolean(card.image)))
            .map((card) => ({
              id: card.id,
              name: card.name,
              localId: card.localId,
              image: card.image,
              setId: set.id,
              setName: set.name,
            }))
        );

      const cards: TCGPocketCard[] = baseCards;

      const response = c.json(cards, 200);
      response.headers.set(
        "Cache-Control",
        `public, max-age=${CACHE_TTL_SECONDS}`
      );
      await cache.put(withoutDetailKey, response.clone());
      return response;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      return c.json(
        { message: "Failed to fetch TCG Pocket cards.", details: message },
        500,
      );
    }
  })
  .get("/cards/:id", async (c) => {
    const { id } = c.req.param();
    try {
      const useDbCache = await isCacheReady(c.env.DB);
      if (useDbCache) {
        const card = await getCachedCardById(c.env.DB, id);
        if (card) return c.json(card, 200);
      }
      const cardRes = await fetch(`${API_BASE}/cards/${id}`);
      if (!cardRes.ok) {
        return c.json(
          { message: "Card not found.", details: `Status ${cardRes.status}` },
          404,
        );
      }
      const card = (await cardRes.json()) as Record<string, unknown>;
      return c.json(card, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      return c.json(
        { message: "Failed to fetch TCG Pocket card.", details: message },
        500,
      );
    }
  })
  .get("/sets", async (c) => {
    try {
      const useDbCache = await isCacheReady(c.env.DB);
      if (useDbCache) {
        const sets = await getCachedSets(c.env.DB);
        return c.json(sets, 200);
      }
      const seriesRes = await fetch(`${API_BASE}/series/tcgp`);
      if (!seriesRes.ok) {
        throw new Error(`Series fetch failed: ${seriesRes.status}`);
      }
      const series = (await seriesRes.json()) as TCGPocketSeries;
      return c.json(series.sets, 200);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown fetch error";
      return c.json(
        { message: "Failed to fetch TCG Pocket sets.", details: message },
        500,
      );
    }
  }).get("/evolution/:name", async (c) => {
  const { name } = c.req.param();
  try {
    const normalized = normalizePokemonName(name);
    const speciesRes = await fetch(`${POKEAPI_BASE}/pokemon-species/${normalized}`);
    if (!speciesRes.ok) {
      return c.json(
        { message: "Pokemon species not found.", details: `Status ${speciesRes.status}` },
        404,
      );
    }
    const species = (await speciesRes.json()) as PokemonSpeciesResponse;
    const chainRes = await fetch(species.evolution_chain.url);
    if (!chainRes.ok) {
      throw new Error(`PokeAPI chain failed: ${chainRes.status}`);
    }
    const chain = (await chainRes.json()) as EvolutionChainResponse;
    const currentNode = findEvolutionNode(chain.chain, normalized);
    const evolvesToNames = currentNode
      ? currentNode.evolves_to.map((node) => node.species.name)
      : [];
    const evolvesFromName = findParentName(chain.chain, normalized);
    const chainNames = Array.from(new Set(collectChainNames(chain.chain)));

    return c.json(
      { evolvesFromName, evolvesToNames, chainNames },
      200,
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown fetch error";
    return c.json(
      { message: "Failed to fetch evolution data.", details: message },
      500,
    );
  }
});

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (index < items.length) {
      const currentIndex = index++;
      results[currentIndex] = await mapper(items[currentIndex]);
    }
  });

  await Promise.all(workers);
  return results;
}
