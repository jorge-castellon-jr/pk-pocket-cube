import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchAllTCGPocketCards,
  fetchTCGPocketSets,
  getCardImageUrl,
  type TCGdexCardWithSet,
  type TCGdexSetListItem,
} from "../api/tcgdex";
import { Button } from "@repo/ui/button";
import { z } from "zod";
import { Diamond, Star, Crown, Sparkles } from "lucide-react";

const searchSchema = z.object({
  set: z.string().optional(),
  sort: z.enum(["name", "set", "id"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  rarity: z.string().optional(),
  q: z.string().optional(),
  draftMode: z.string().optional(),
});

export const Route = createFileRoute("/database")({
  validateSearch: (search) => searchSchema.parse(search),
  component: DatabasePage,
});

function DatabasePage() {
  const search = Route.useSearch();
  const navigate = Route.useNavigate();
  const selectedSet = search.set ?? "all";
  const sortBy = search.sort ?? "id";
  const sortOrder = search.order ?? "asc";
  const selectedRarity = search.rarity ?? "all";
  const searchQuery = search.q ?? "";
  const isDraftMode = search.draftMode === "1";

  const setsQuery = useQuery({
    queryKey: ["tcgpocket", "sets"],
    queryFn: fetchTCGPocketSets,
    staleTime: 1000 * 60 * 10, // 10 min
  });
  const cardsQuery = useQuery({
    queryKey: ["tcgpocket", "cards"],
    queryFn: fetchAllTCGPocketCards,
    staleTime: 1000 * 60 * 10, // 10 min
  });

  if (cardsQuery.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex flex-col items-center justify-center gap-6">
        <div className="animate-pulse text-white/70">Loading card database…</div>
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:0ms]" />
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:150ms]" />
          <div className="w-3 h-3 rounded-full bg-amber-500 animate-bounce [animation-delay:300ms]" />
        </div>
      </div>
    );
  }

  if (cardsQuery.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex flex-col items-center justify-center gap-6 px-6">
        <p className="text-red-300">
          Failed to load cards: {String(cardsQuery.error?.message)}
        </p>
        <Button variant="outline" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  const cards = cardsQuery.data ?? [];
  const sets = setsQuery.data ?? [];
  const totalCards = sets.reduce(
    (sum, set) => sum + (set.cardCount?.total ?? 0),
    0
  );
  const filteredCards =
    selectedSet === "all"
      ? cards
      : cards.filter((card) => card.setId === selectedSet);
  const rarityOptions = Array.from(
    new Set(
      cards
        .map((card) => card.rarity)
        .filter((rarity): rarity is string => Boolean(rarity))
    )
  ).sort((a, b) => a.localeCompare(b));
  const sortedRarities = sortRarities(rarityOptions);
  const effectiveRarity =
    sortedRarities.length > 0 ? selectedRarity : "all";
  const rarityFiltered =
    effectiveRarity === "all"
      ? filteredCards
      : filteredCards.filter(
          (card) =>
            card.rarity?.toLowerCase() === effectiveRarity.toLowerCase()
        );
  const searchFiltered =
    searchQuery.trim().length === 0
      ? rarityFiltered
      : rarityFiltered.filter((card) => {
          const q = searchQuery.toLowerCase();
          return (
            card.name.toLowerCase().includes(q) ||
            card.id.toLowerCase().includes(q)
          );
        });
  const sortedCards = [...searchFiltered].sort((a, b) => {
    const compareValue =
      sortBy === "set"
        ? a.setName.localeCompare(b.setName)
        : sortBy === "id"
          ? a.id.localeCompare(b.id)
          : a.name.localeCompare(b.name);
    return sortOrder === "desc" ? compareValue * -1 : compareValue;
  });
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-blue-950/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">
            ← Home
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              Card Database
            </p>
            <h1 className="text-lg font-semibold">Pokémon TCG Pocket</h1>
          </div>
          <span className="text-sm text-white/70 tabular-nums">
            {sortedCards.length} cards
          </span>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-sm text-white/70">Browse every TCG Pocket card.</p>
              <p className="text-lg font-semibold">All sets. All cards.</p>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <select
                  className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
                  value={sortBy}
                  onChange={(e) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        sort: e.target.value as "name" | "set" | "id",
                      }),
                    })
                  }
                >
                  <option value="name">Name</option>
                  <option value="set">Set</option>
                  <option value="id">Card ID</option>
                </select>
                <select
                  className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
                  value={sortOrder}
                  onChange={(e) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        order: e.target.value as "asc" | "desc",
                      }),
                    })
                  }
                >
                  <option value="asc">A → Z</option>
                  <option value="desc">Z → A</option>
                </select>
              </div>
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <input
                  value={searchQuery}
                  onChange={(e) =>
                    navigate({
                      search: (prev) => ({
                        ...prev,
                        q: e.target.value || undefined,
                      }),
                    })
                  }
                  placeholder="Search by name or ID"
                  className="w-full sm:w-64 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
                />
                <div className="flex flex-wrap gap-2">
                  <RarityChip
                    rarity="all"
                    selected={effectiveRarity === "all"}
                    onSelect={(value) =>
                      navigate({
                        search: (prev) => ({
                          ...prev,
                          rarity: value === "all" ? undefined : value,
                        }),
                      })
                    }
                  />
                  {sortedRarities.map((rarity) => (
                    <RarityChip
                      key={rarity}
                      rarity={rarity}
                      selected={effectiveRarity === rarity}
                      onSelect={(value) =>
                        navigate({
                          search: (prev) => ({
                            ...prev,
                            rarity: value,
                          }),
                        })
                      }
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="mb-10">
          <div className="flex items-center justify-between mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-yellow-200">
                Choose a Set
              </p>
              <p className="text-white/70 text-sm mt-1">
                Select a set to explore its cards.
              </p>
            </div>
            <span className="text-xs text-white/60">
              {sets.length} sets
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <SetTile
              key="all"
              set={{
                id: "all",
                name: "All Sets",
                cardCount: { total: totalCards },
              }}
              selected={selectedSet === "all"}
              onSelect={(setId) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    set: setId === "all" ? undefined : setId,
                  }),
                })
              }
            />
          {sets.map((set) => (
            <SetTile
              key={set.id}
              set={set}
              selected={selectedSet === set.id}
              onSelect={(setId) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    set: setId,
                  }),
                })
              }
            />
          ))}
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {sortedCards.map((card) => (
            <CardItem key={card.id} card={card} draftMode={isDraftMode} />
          ))}
        </div>
      </main>
    </div>
  );
}

function SetTile({
  set,
  selected,
  onSelect,
}: {
  set: TCGdexSetListItem;
  selected: boolean;
  onSelect: (setId: string) => void;
}) {
  const logoUrl = set.logo ? ensureWebpExtension(set.logo) : null;
  const cardCount = set.cardCount?.total ?? 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(set.id)}
      className={`group relative overflow-hidden rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-yellow-200/70 bg-yellow-200/15 shadow-[0_0_0_1px_rgba(252,211,77,0.25)]"
          : "border-white/10 bg-white/5 hover:bg-white/10"
      }`}
    >
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-200/10 via-transparent to-rose-300/10" />
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center gap-3">
        {logoUrl ? (
          <>
            <img
              src={logoUrl}
              alt={`${set.name} logo`}
              className="h-16 w-auto object-contain"
              loading="lazy"
            />
            <div className="text-xs text-white/70 uppercase tracking-[0.2em]">
              {cardCount} cards
            </div>
          </>
        ) : (
          <>
            <div className="text-sm font-semibold leading-snug text-center">
              {set.name}
            </div>
            <div className="text-xs text-white/70 uppercase tracking-[0.2em]">
              {cardCount} cards
            </div>
          </>
        )}
      </div>
    </button>
  );
}

function ensureWebpExtension(url: string) {
  if (url.endsWith(".webp")) return url;
  return `${url}.webp`;
}

function CardItem({
  card,
  draftMode,
}: {
  card: TCGdexCardWithSet;
  draftMode: boolean;
}) {
  const imgUrl = getCardImageUrl(card, "small");
  return (
    <Link
      to="/card/$cardId"
      params={{ cardId: card.id }}
      search={draftMode ? { draftMode: "1" } : undefined}
      className="group relative block"
    >
      <div className="aspect-[2.5/3.5] rounded-2xl bg-blue-950/30 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03] relative">
        <img
          src={imgUrl}
          alt={card.name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://placehold.co/245x337/1e1b4b/fff?text=No+Image`;
          }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          <div className="absolute inset-0 ring-2 ring-yellow-200/40" />
        </div>
      </div>
    </Link>
  );
}

function RarityChip({
  rarity,
  selected,
  onSelect,
}: {
  rarity: string;
  selected: boolean;
  onSelect: (rarity: string) => void;
}) {
  const parsed = parseRarity(rarity);
  const isAll = rarity === "all";
  return (
    <button
      type="button"
      onClick={() => onSelect(rarity)}
      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
        selected
          ? "border-yellow-200/70 bg-yellow-200/15 text-yellow-100"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
      }`}
    >
      {parsed && !isAll && (
        <span className="flex items-center gap-1">
          {Array.from({ length: parsed.count }).map((_, index) => (
            <parsed.Icon
              key={`${parsed.type}-${index}`}
              className={`h-3.5 w-3.5 ${parsed.className}`}
              stroke="none"
              fill="currentColor"
            />
          ))}
        </span>
      )}
      {isAll && <span>All</span>}
      {!isAll && !parsed && <span>{rarity}</span>}
    </button>
  );
}

function parseRarity(rarity: string) {
  const value = rarity.toLowerCase();
  const count =
    value.includes("one") ? 1 :
    value.includes("two") ? 2 :
    value.includes("three") ? 3 :
    value.includes("four") ? 4 :
    value.includes("five") ? 5 : 1;

  if (value.includes("diamond")) {
    return {
      type: "diamond",
      Icon: Diamond,
      count,
      label: rarity,
      className: "text-sky-200",
    };
  }
  if (value.includes("star")) {
    return {
      type: "star",
      Icon: Star,
      count,
      label: rarity,
      className: "text-yellow-200",
    };
  }
  if (value.includes("shiny")) {
    return {
      type: "shiny",
      Icon: Sparkles,
      count,
      label: rarity,
      className: "text-emerald-200",
    };
  }
  if (value.includes("crown")) {
    return {
      type: "crown",
      Icon: Crown,
      count,
      label: rarity,
      className: "text-amber-200",
    };
  }
  return null;
}

function sortRarities(rarities: string[]) {
  const priority = (rarity: string) => {
    const value = rarity.toLowerCase();
    if (value.includes("diamond")) return 1;
    if (value.includes("star")) return 2;
    if (value.includes("shiny")) return 3;
    if (value.includes("crown")) return 4;
    return 5;
  };
  return [...rarities].sort((a, b) => {
    const pa = priority(a);
    const pb = priority(b);
    if (pa !== pb) return pa - pb;
    const ca = parseRarity(a)?.count ?? 0;
    const cb = parseRarity(b)?.count ?? 0;
    if (ca !== cb) return ca - cb;
    return a.localeCompare(b);
  });
}
