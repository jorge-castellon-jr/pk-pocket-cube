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

const searchSchema = z.object({
  set: z.string().optional(),
  sort: z.enum(["name", "set", "id"]).optional(),
  order: z.enum(["asc", "desc"]).optional(),
  rarity: z.string().optional(),
  q: z.string().optional(),
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
  const rarityFiltered =
    selectedRarity === "all"
      ? filteredCards
      : filteredCards.filter(
          (card) => card.rarity?.toLowerCase() === selectedRarity.toLowerCase()
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
  const rarityOptions = Array.from(
    new Set(cards.map((card) => card.rarity).filter(Boolean))
  ).sort((a, b) => a.localeCompare(b));

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-blue-950/80 backdrop-blur">
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
        <div className="mb-6 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <p className="text-sm text-white/70">Browse every TCG Pocket card.</p>
            <p className="text-lg font-semibold">All sets. All cards.</p>
          </div>
          <div className="flex flex-wrap gap-3 items-center">
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
              className="w-48 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50"
            />
            <select
              className="rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-sm text-white"
              value={selectedRarity}
              onChange={(e) =>
                navigate({
                  search: (prev) => ({
                    ...prev,
                    rarity: e.target.value === "all" ? undefined : e.target.value,
                  }),
                })
              }
            >
              <option value="all">All Rarities</option>
              {rarityOptions.map((rarity) => (
                <option key={rarity} value={rarity}>
                  {rarity}
                </option>
              ))}
            </select>
            <div className="text-xs uppercase tracking-[0.25em] text-white/60">
              Sort
            </div>
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
            <CardItem key={card.id} card={card} />
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

function CardItem({ card }: { card: TCGdexCardWithSet }) {
  const imgUrl = getCardImageUrl(card, "small");
  return (
    <Link
      to="/card/$cardId"
      params={{ cardId: card.id }}
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
