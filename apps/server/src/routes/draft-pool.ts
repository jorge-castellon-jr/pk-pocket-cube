import { Hono, type Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { and, eq } from "drizzle-orm";
import type { HonoAppContext } from "../auth";
import type { Env } from "../env-types";
import { withAuth } from "../middlewares/auth.middleware";
import {
  account,
  draftPoolEditor,
  draftPoolExclusion,
  draftPoolPick,
  user as userTable,
} from "../db/schema";
import { isCacheReady, getCachedCards } from "../lib/tcgp-cache";

const API_BASE = "https://api.tcgdex.net/v2/en";
const POKEAPI_BASE = "https://pokeapi.co/api/v2";
const CACHE_TTL_SECONDS = 60 * 15;

type DraftPoolCard = {
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

const exclusionScopes = new Set(["evolution", "shop", "both"]);
type DraftContext = Context<any, string>;

async function isOwner(c: DraftContext): Promise<boolean> {
  const currentUser = c.get("user");
  if (!currentUser) return false;
  const [first] = await c.var.db
    .select({ id: userTable.id })
    .from(userTable)
    .orderBy(userTable.createdAt)
    .limit(1);
  return first?.id === currentUser.id;
}

export const draftPool = new Hono<HonoAppContext & { Bindings: Env }>()
  .get("/", async (c) => {
    const db = c.var.db;
    const cards: DraftPoolCard[] = (await isCacheReady(c.env.DB))
      ? (await getCachedCards(c.env.DB, { includeNoImage: true })) as DraftPoolCard[]
      : await fetchAllCardsFromTcgdex(true);
    const [picks, exclusions, isEditor] = await Promise.all([
      db.select().from(draftPoolPick),
      db.select().from(draftPoolExclusion),
      getEditorStatus(c),
    ]);

    const cardsById = new Map(cards.map((card) => [card.id, card]));
    const picksWithCards = picks
      .map((pick) => cardsById.get(pick.cardId))
      .filter((card): card is DraftPoolCard => Boolean(card));

    const exclusionByScope = buildExclusionSets(exclusions);
    const { evolutionsByPick, shopByPick } = await buildGeneratedLists({
      picks: picksWithCards,
      cards,
      excludedEvolution: exclusionByScope.evolution,
      excludedShop: exclusionByScope.shop,
    });

    return c.json(
      {
        picks: picksWithCards,
        exclusions,
        evolutionsByPick,
        shopByPick,
        isEditor,
      },
      200,
    );
  })
  .put("/picks", withAuth, async (c) => {
    await assertEditor(c);
    const body = await readJsonBody(c);
    const cardIds = Array.isArray(body?.cardIds)
      ? body.cardIds.filter(
          (value: unknown): value is string => typeof value === "string",
        )
      : null;
    if (!cardIds) {
      throw new HTTPException(400, { message: "Invalid picks payload." });
    }

    const db = c.var.db;
    await db.delete(draftPoolPick);
    if (cardIds.length > 0) {
      await db.insert(draftPoolPick).values(
        cardIds.map((cardId: string) => ({
          id: crypto.randomUUID(),
          cardId,
          createdAt: new Date(),
        })),
      );
    }
    return c.json({ ok: true }, 200);
  })
  .put("/exclusions", withAuth, async (c) => {
    await assertEditor(c);
    const body = await readJsonBody(c);
    const exclusions = Array.isArray(body?.exclusions)
      ? body.exclusions.filter(
          (
            item: unknown,
          ): item is { cardId: string; scope: "evolution" | "shop" | "both" } =>
            Boolean(item) &&
            typeof (item as { cardId?: unknown }).cardId === "string" &&
            typeof (item as { scope?: unknown }).scope === "string" &&
            exclusionScopes.has((item as { scope: string }).scope),
        )
      : null;
    if (!exclusions) {
      throw new HTTPException(400, { message: "Invalid exclusions payload." });
    }

    const db = c.var.db;
    await db.delete(draftPoolExclusion);
    if (exclusions.length > 0) {
      await db.insert(draftPoolExclusion).values(
        exclusions.map((item: { cardId: string; scope: "evolution" | "shop" | "both" }) => ({
          id: crypto.randomUUID(),
          cardId: item.cardId,
          scope: item.scope as "evolution" | "shop" | "both",
          createdAt: new Date(),
        })),
      );
    }
    return c.json({ ok: true }, 200);
  })
  .get("/editors", withAuth, async (c) => {
    const currentUser = c.get("user");
    if (!currentUser) {
      throw new HTTPException(401, { message: "Please login" });
    }

    const db = c.var.db;
    const [discordAccount] = await db
      .select({ accountId: account.accountId })
      .from(account)
      .where(
        and(
          eq(account.userId, currentUser.id),
          eq(account.providerId, "discord"),
        ),
      )
      .limit(1);
    if (!discordAccount) {
      throw new HTTPException(403, {
        message: "Discord account required.",
      });
    }

    const [currentUserEditor] = await db
      .select({ id: draftPoolEditor.id })
      .from(draftPoolEditor)
      .where(eq(draftPoolEditor.discordAccountId, discordAccount.accountId))
      .limit(1);
    const isDraftPoolEditor = Boolean(currentUserEditor);
    const canManageEditors = isDraftPoolEditor || (await isOwner(c));

    const discordUsers = await db
      .select({
        userId: userTable.id,
        name: userTable.name,
        email: userTable.email,
        image: userTable.image,
        accountId: account.accountId,
      })
      .from(account)
      .innerJoin(userTable, eq(account.userId, userTable.id))
      .where(eq(account.providerId, "discord"));

    const editorAccountIds = new Set(
      (await db.select({ discordAccountId: draftPoolEditor.discordAccountId }).from(draftPoolEditor)).map(
        (r) => r.discordAccountId,
      ),
    );

    const list = discordUsers.map((row) => ({
      id: row.userId,
      name: row.name,
      email: row.email,
      image: row.image,
      canEdit: editorAccountIds.has(row.accountId),
    }));

    return c.json({ users: list, isEditor: canManageEditors }, 200);
  })
  .put("/editors", withAuth, async (c) => {
    const owner = await isOwner(c);
    if (!owner) await assertEditor(c);
    const body = await readJsonBody(c);
    const userId =
      typeof body?.userId === "string" ? body.userId : null;
    const canEdit = typeof body?.canEdit === "boolean" ? body.canEdit : null;
    if (userId === null || canEdit === null) {
      throw new HTTPException(400, {
        message: "Body must include userId (string) and canEdit (boolean).",
      });
    }

    const db = c.var.db;
    const [target] = await db
      .select({
        accountId: account.accountId,
        userName: userTable.name,
      })
      .from(account)
      .innerJoin(userTable, eq(account.userId, userTable.id))
      .where(
        and(eq(account.userId, userId), eq(account.providerId, "discord")),
      )
      .limit(1);
    if (!target) {
      throw new HTTPException(404, {
        message: "User not found or has no Discord account.",
      });
    }

    if (canEdit) {
      const [existing] = await db
        .select({ id: draftPoolEditor.id })
        .from(draftPoolEditor)
        .where(eq(draftPoolEditor.discordAccountId, target.accountId))
        .limit(1);
      if (!existing) {
        await db.insert(draftPoolEditor).values({
          id: crypto.randomUUID(),
          discordAccountId: target.accountId,
          displayName: target.userName ?? null,
          createdAt: new Date(),
        });
      }
    } else {
      await db
        .delete(draftPoolEditor)
        .where(eq(draftPoolEditor.discordAccountId, target.accountId));
    }

    return c.json({ ok: true }, 200);
  });

async function assertEditor(c: DraftContext) {
  const user = c.get("user");
  if (!user) {
    throw new HTTPException(401, { message: "Please login" });
  }
  const db = c.var.db;
  const [discordAccount] = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(
      and(eq(account.userId, user.id), eq(account.providerId, "discord")),
    )
    .limit(1);
  if (!discordAccount) {
    throw new HTTPException(403, { message: "Discord account required." });
  }

  const [editor] = await db
    .select({ id: draftPoolEditor.id })
    .from(draftPoolEditor)
    .where(eq(draftPoolEditor.discordAccountId, discordAccount.accountId))
    .limit(1);
  if (!editor) {
    throw new HTTPException(403, { message: "Not allowed to edit draft pool." });
  }
}

async function getEditorStatus(c: DraftContext) {
  const user = c.get("user");
  if (!user) return false;
  const db = c.var.db;
  const [discordAccount] = await db
    .select({ accountId: account.accountId })
    .from(account)
    .where(
      and(eq(account.userId, user.id), eq(account.providerId, "discord")),
    )
    .limit(1);
  if (!discordAccount) return false;

  const [editor] = await db
    .select({ id: draftPoolEditor.id })
    .from(draftPoolEditor)
    .where(eq(draftPoolEditor.discordAccountId, discordAccount.accountId))
    .limit(1);
  return Boolean(editor);
}

async function readJsonBody(c: DraftContext) {
  try {
    return await c.req.json();
  } catch {
    return null;
  }
}

function buildExclusionSets(
  exclusions: Array<{
    cardId: string;
    scope: "evolution" | "shop" | "both";
  }>,
) {
  const evolution = new Set<string>();
  const shop = new Set<string>();
  exclusions.forEach((exclusion) => {
    if (exclusion.scope === "evolution" || exclusion.scope === "both") {
      evolution.add(exclusion.cardId);
    }
    if (exclusion.scope === "shop" || exclusion.scope === "both") {
      shop.add(exclusion.cardId);
    }
  });
  return { evolution, shop };
}

async function buildGeneratedLists({
  picks,
  cards,
  excludedEvolution,
  excludedShop,
}: {
  picks: DraftPoolCard[];
  cards: DraftPoolCard[];
  excludedEvolution: Set<string>;
  excludedShop: Set<string>;
}) {
  const cardsByNormalizedName = new Map<string, DraftPoolCard[]>();
  cards.forEach((card) => {
    const key = normalizePokemonName(card.name);
    const current = cardsByNormalizedName.get(key) ?? [];
    current.push(card);
    cardsByNormalizedName.set(key, current);
  });

  const pickIds = new Set(picks.map((pick) => pick.id));
  const pickNormalizedNames = new Set(
    picks.map((pick) => normalizePokemonName(pick.name)),
  );
  const evolutionCache = new Map<string, string[]>();
  const evolutionsByPick: Record<string, DraftPoolCard[]> = {};
  const shopByPick: Record<string, DraftPoolCard[]> = {};

  await Promise.all(
    picks.map(async (pick) => {
      const normalizedName = normalizePokemonName(pick.name);
      const chainNames = await getEvolutionChainNames(
        normalizedName,
        evolutionCache,
      );
      const evolutionCards = chainNames.flatMap(
        (name) => cardsByNormalizedName.get(name) ?? [],
      );
      evolutionsByPick[pick.id] = uniqueCards(evolutionCards)
        .filter(
          (card) =>
            !pickIds.has(card.id) && !excludedEvolution.has(card.id),
        )
        .filter(
          (card) => !pickNormalizedNames.has(normalizePokemonName(card.name)),
        );

      const shopCandidates = cardsByNormalizedName.get(normalizedName) ?? [];
      shopByPick[pick.id] = shopCandidates
        .filter((card) => card.id !== pick.id)
        .filter((card) => !pickIds.has(card.id) && !excludedShop.has(card.id))
        .sort(sortCards);
    }),
  );

  return { evolutionsByPick, shopByPick };
}

function uniqueCards(cards: DraftPoolCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    if (seen.has(card.id)) return false;
    seen.add(card.id);
    return true;
  });
}

function sortCards(a: DraftPoolCard, b: DraftPoolCard) {
  const setCompare = a.setName.localeCompare(b.setName);
  if (setCompare !== 0) return setCompare;
  return a.id.localeCompare(b.id);
}

async function getEvolutionChainNames(
  normalizedName: string,
  cache: Map<string, string[]>,
) {
  const cached = cache.get(normalizedName);
  if (cached) return cached;
  const speciesRes = await fetch(
    `${POKEAPI_BASE}/pokemon-species/${normalizedName}`,
  );
  if (!speciesRes.ok) {
    cache.set(normalizedName, [normalizedName]);
    return [normalizedName];
  }
  const species = (await speciesRes.json()) as PokemonSpeciesResponse;
  const chainRes = await fetch(species.evolution_chain.url);
  if (!chainRes.ok) {
    cache.set(normalizedName, [normalizedName]);
    return [normalizedName];
  }
  const chain = (await chainRes.json()) as EvolutionChainResponse;
  const names = Array.from(
    new Set(collectChainNames(chain.chain).map(normalizePokemonName)),
  );
  cache.set(normalizedName, names);
  return names;
}

function collectChainNames(node: EvolutionChainLink, list: string[] = []) {
  list.push(node.species.name);
  if (node.evolves_to.length === 0) return list;
  node.evolves_to.forEach((child) => collectChainNames(child, list));
  return list;
}

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

async function fetchAllCardsFromTcgdex(withDetail: boolean) {
  const cacheKey = new Request(
    `${API_BASE}/cache/tcgp/cards?detail=${withDetail ? "1" : "0"}&includeNoImage=1`,
  );
  const cache = caches.default;
  const cached = await cache.match(cacheKey);
  if (cached) {
    return (await cached.json()) as DraftPoolCard[];
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
      set.cards.map((card) => ({
        id: card.id,
        name: card.name,
        localId: card.localId,
        image: card.image,
        setId: set.id,
        setName: set.name,
      })),
    );

  let cards: DraftPoolCard[] = baseCards;
  if (withDetail) {
    cards = await mapWithConcurrency(baseCards, 6, async (card) => {
      const cardRes = await fetch(`${API_BASE}/cards/${card.id}`);
      if (!cardRes.ok) return card;
      const detail = (await cardRes.json()) as { rarity?: string };
      return {
        ...card,
        rarity: detail?.rarity,
      };
    });
  }

  const response = new Response(JSON.stringify(cards), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": `public, max-age=${CACHE_TTL_SECONDS}`,
    },
  });
  await cache.put(cacheKey, response.clone());
  return cards;
}

async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (index < items.length) {
        const currentIndex = index++;
        results[currentIndex] = await mapper(items[currentIndex]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}
