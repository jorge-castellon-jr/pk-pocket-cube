import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTCGPocketCardById,
  getCardImageUrl,
  fetchAllTCGPocketCardsIncludingNoImage,
  fetchEvolutionData,
} from "../api/tcgdex";
import {
  fetchDraftPool,
  updateDraftPoolExclusions,
  updateDraftPoolPicks,
  type DraftPoolExclusion,
} from "../api/draft-pool";
import { Button } from "@repo/ui/button";
import {
  Leaf,
  Flame,
  Droplet,
  Zap,
  Sparkles,
  HandFist,
  Moon,
  Shield,
  Hexagon,
  Circle,
  Eye,
  Diamond,
  Crown,
  Star,
} from "lucide-react";
import { normalizePokemonName } from "../api/pokeapi";
import { z } from "zod";

export const Route = createFileRoute("/card/$cardId")({
  validateSearch: (search) =>
    z
      .object({
        draftMode: z.string().optional(),
        draftTab: z.string().optional(),
      })
      .parse(search),
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const search = Route.useSearch();
  const isDraftMode = search.draftMode === "1";
  const draftTab = search.draftTab === "shop" ? "shop" : "draft";
  const queryClient = useQueryClient();
  const cardQuery = useQuery({
    queryKey: ["tcgpocket", "card", cardId],
    queryFn: () => fetchTCGPocketCardById(cardId),
  });
  const evolutionsQuery = useQuery({
    queryKey: ["pokeapi", "evolution", cardQuery.data?.name],
    queryFn: () => fetchEvolutionData(cardQuery.data?.name ?? ""),
    enabled: Boolean(cardQuery.data?.name),
  });
  const allCardsQuery = useQuery({
    queryKey: ["tcgpocket", "cards", "includeNoImage"],
    queryFn: fetchAllTCGPocketCardsIncludingNoImage,
    staleTime: 1000 * 60 * 10,
    enabled: Boolean(evolutionsQuery.data),
  });
  const draftPoolQuery = useQuery({
    queryKey: ["draft-pool"],
    queryFn: fetchDraftPool,
    enabled: isDraftMode,
  });
  const updatePicksMutation = useMutation({
    mutationFn: updateDraftPoolPicks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draft-pool"] }),
  });
  const updateExclusionsMutation = useMutation({
    mutationFn: updateDraftPoolExclusions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draft-pool"] }),
  });

  if (cardQuery.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex items-center justify-center">
        <p className="text-white/70">Loading card details…</p>
      </div>
    );
  }

  if (cardQuery.isError || !cardQuery.data) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-300">
          Failed to load card details:{" "}
          {String(cardQuery.error?.message ?? "Unknown error")}
        </p>
        <Button variant="outline" asChild>
          <Link to="/database">Back to database</Link>
        </Button>
      </div>
    );
  }

  const card = cardQuery.data;
  const imgUrl = getCardImageUrl(card, "large", "webp");
  const evolutionData = evolutionsQuery.data;
  const allCards = allCardsQuery.data ?? [];
  const draftPool = draftPoolQuery.data;
  const isEditor = draftPool?.isEditor ?? false;
  const isPick = draftPool?.picks.some((pick) => pick.id === card.id) ?? false;
  const exclusion =
    draftPool?.exclusions.find((item) => item.cardId === card.id) ?? null;
  const evolvesToNames = evolutionData?.evolvesToNames ?? [];
  const sameNameMatches = allCards.filter(
    (c) =>
      normalizePokemonName(c.name) === normalizePokemonName(card.name) &&
      c.id !== card.id &&
      Boolean(c.image),
  );
  const evolvesToMatches = evolvesToNames.length
    ? allCards.filter(
        (c) =>
          evolvesToNames.includes(normalizePokemonName(c.name)) &&
          Boolean(c.image),
      )
    : [];
  const evolvesFromMatches = evolutionData?.evolvesFromName
    ? allCards.filter(
        (c) =>
          normalizePokemonName(c.name) === evolutionData.evolvesFromName &&
          Boolean(c.image),
      )
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-blue-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          {isDraftMode ? (
            <a
              href="/draft-pool"
              className="text-white/70 hover:text-white text-sm"
            >
              ← Back to draft pool
            </a>
          ) : (
            <Link to="/database" className="text-white/70 hover:text-white text-sm">
              ← Back to database
            </Link>
          )}
          <h1 className="text-lg font-semibold">{card.name}</h1>
          {isDraftMode ? (
            <span className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              Draft Mode
            </span>
          ) : (
            <span className="text-sm text-white/70">
              {card.set?.name ?? "TCG Pocket"}
            </span>
          )}
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10">
        <div className="flex items-center justify-center">
          <img
            src={imgUrl}
            alt={card.name}
            className="w-full object-contain drop-shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                `https://placehold.co/600x825/1e1b4b/fff?text=No+Image`;
            }}
          />
        </div>
        <div className="space-y-6">
          {isDraftMode && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
                Draft Controls
              </p>
              {!isEditor ? (
                <p className="text-sm text-white/60">
                  You can view draft mode, but editor access is required to update
                  picks or exclusions.
                </p>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    variant={isPick ? "outline" : "primary"}
                    size="sm"
                    onClick={() => {
                      const picks = draftPool?.picks ?? [];
                      const next = isPick
                        ? picks.filter((pick) => pick.id !== card.id)
                        : [...picks, card];
                      updatePicksMutation.mutate(next.map((pick) => pick.id));
                    }}
                  >
                    {isPick ? "Remove from picks" : "Add to picks"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = applyExclusionUpdate(
                        draftPool?.exclusions ?? [],
                        card.id,
                        "evolution",
                      );
                      updateExclusionsMutation.mutate(next);
                    }}
                  >
                    {exclusion?.scope === "evolution" || exclusion?.scope === "both"
                      ? "Undo evolution exclusion"
                      : "Exclude from evolutions"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const next = applyExclusionUpdate(
                        draftPool?.exclusions ?? [],
                        card.id,
                        "shop",
                      );
                      updateExclusionsMutation.mutate(next);
                    }}
                  >
                    {exclusion?.scope === "shop" || exclusion?.scope === "both"
                      ? "Undo shop exclusion"
                      : "Exclude from shop"}
                  </Button>
                  <a
                    href="/draft-pool"
                    className="text-xs text-white/60 hover:text-white/80"
                  >
                    View draft pool
                  </a>
                </div>
              )}
            </div>
          )}
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-yellow-200">
              Card Details
            </p>
            <h2 className="text-3xl font-bold mt-2">{card.name}</h2>
            {card.description && (
              <p className="text-white/70 mt-3">{card.description}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Detail label="Set" value={card.set?.name} />
            <RarityDetail rarity={card.rarity} />
            <Detail label="HP" value={card.hp ? String(card.hp) : undefined} />
            <Detail label="Stage" value={card.stage} />
            <Detail label="Types" value={card.types?.join(", ")} />
            <Detail label="Illustrator" value={card.illustrator} />
          </div>

          {card.attacks && card.attacks.length > 0 && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <h3 className="font-semibold mb-3">Attacks</h3>
              <div className="space-y-3">
                {card.attacks.map((attack, idx) => (
                  <div
                    key={`${attack.name ?? "attack"}-${idx}`}
                    className="text-sm"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{attack.name}</span>
                      <div className="flex items-center gap-2">
                        {attack.cost && attack.cost.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {attack.cost.map((cost, costIndex) => (
                              <span
                                key={`${cost}-${costIndex}`}
                                title={cost}
                                aria-label={cost}
                                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${getCostIconClass(cost)}`}
                              >
                                <EnergyIcon type={cost} />
                                <span className="sr-only">{cost}</span>
                              </span>
                            ))}
                          </div>
                        )}
                        {attack.damage && (
                          <span className="text-yellow-200 text-lg font-bold">
                            {attack.damage}
                          </span>
                        )}
                      </div>
                    </div>
                    {attack.effect && (
                      <p className="text-white/70 mt-1">{attack.effect}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </main>
      {(card.evolvesFrom ||
        evolvesFromMatches.length > 0 ||
        (evolvesToMatches && evolvesToMatches.length > 0) ||
        sameNameMatches.length > 0) && (
        <section className="max-w-6xl mx-auto px-6 pb-12">
          <h3 className="font-semibold mb-4">Evolutions</h3>
          {sameNameMatches.length > 0 && (
            <div className="mb-6">
              <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-2">
                Other {card.name} Cards
              </p>
              <div className="flex flex-wrap gap-6">
                {sameNameMatches.map((evo) => (
                  <EvolutionCardLink
                    key={evo.id}
                    id={evo.id}
                    name={evo.name}
                    image={evo.image}
                    draftMode={isDraftMode}
                    draftTab={draftTab}
                  />
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-6">
            {(card.evolvesFrom || evolvesFromMatches.length > 0) && (
              <div>
                <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-2">
                  Evolves From
                </p>
                {evolvesFromMatches.length > 0 ? (
                  <div className="flex flex-wrap gap-6">
                    {evolvesFromMatches.map((evo) => (
                      <EvolutionCardLink
                        key={evo.id}
                        id={evo.id}
                        name={evo.name}
                        image={evo.image}
                        draftMode={isDraftMode}
                        draftTab={draftTab}
                      />
                    ))}
                  </div>
                ) : (
                  <span className="text-white/70 text-sm">
                    {card.evolvesFrom ?? "—"}
                  </span>
                )}
              </div>
            )}
            {evolvesToMatches.length > 0 && (
              <div>
                <p className="text-white/60 text-xs uppercase tracking-[0.2em] mb-2">
                  Evolves To
                </p>
                <div className="flex flex-wrap gap-6">
                  {evolvesToMatches.map((evo) => (
                    <EvolutionCardLink
                      key={evo.id}
                      id={evo.id}
                      name={evo.name}
                      image={evo.image}
                      draftMode={isDraftMode}
                      draftTab={draftTab}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/60">
        {label}
      </p>
      <p className="text-sm font-semibold mt-2">{value ?? "—"}</p>
    </div>
  );
}

function RarityDetail({ rarity }: { rarity?: string }) {
  const parsed = parseRarity(rarity);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/60">
        Rarity
      </p>
      {parsed ? (
        <div className="mt-2 flex items-center gap-1">
          {Array.from({ length: parsed.count }).map((_, index) => (
            <span
              key={`${parsed.type}-${index}`}
              className={`inline-flex h-5 w-5 items-center justify-center ${parsed.className}`}
            >
              <SolidIcon Icon={parsed.Icon} />
            </span>
          ))}
        </div>
      ) : (
        <p className="text-sm font-semibold mt-2">{rarity ?? "—"}</p>
      )}
    </div>
  );
}

function parseRarity(rarity?: string) {
  if (!rarity) return null;
  const value = rarity.toLowerCase();
  const count = value.includes("one")
    ? 1
    : value.includes("two")
      ? 2
      : value.includes("three")
        ? 3
        : value.includes("four")
          ? 4
          : value.includes("five")
            ? 5
            : 1;

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

function getCostIconClass(cost: string) {
  const normalized = cost.toLowerCase();
  switch (normalized) {
    case "grass":
      return "border-emerald-300/50 bg-emerald-400/30";
    case "fire":
      return "border-orange-300/50 bg-orange-400/30";
    case "water":
      return "border-sky-300/50 bg-sky-400/30";
    case "lightning":
      return "border-yellow-300/60 bg-yellow-300/35";
    case "psychic":
      return "border-fuchsia-300/50 bg-fuchsia-400/30";
    case "fighting":
      return "border-amber-300/50 bg-amber-400/30";
    case "darkness":
      return "border-slate-400/60 bg-slate-500/35";
    case "metal":
      return "border-zinc-300/60 bg-zinc-300/35";
    case "dragon":
      return "border-rose-300/50 bg-rose-400/30";
    case "colorless":
      return "border-white/40 bg-white/20";
    default:
      return "border-white/30 bg-white/15";
  }
}

function EnergyIcon({ type }: { type: string }) {
  const normalized = type.toLowerCase();
  switch (normalized) {
    case "grass":
      return <SolidIcon Icon={Leaf} />;
    case "fire":
      return <SolidIcon Icon={Flame} />;
    case "water":
      return <SolidIcon Icon={Droplet} />;
    case "lightning":
      return <SolidIcon Icon={Zap} />;
    case "psychic":
      return <OutlineIcon Icon={Eye} />;
    case "fighting":
      return <SolidIcon Icon={HandFist} />;
    case "darkness":
      return <SolidIcon Icon={Moon} />;
    case "metal":
      return <SolidIcon Icon={Shield} />;
    case "dragon":
      return <SolidIcon Icon={Hexagon} />;
    case "colorless":
      return <OutlineIcon Icon={Diamond} />;
    default:
      return <SolidIcon Icon={Circle} />;
  }
}

function SolidIcon({ Icon }: { Icon: typeof Leaf }) {
  return (
    <Icon className="h-4 w-4 text-white/90" stroke="none" fill="currentColor" />
  );
}

function OutlineIcon({ Icon }: { Icon: typeof Leaf }) {
  return <Icon className="h-4 w-4 text-white/90" strokeWidth={2} fill="none" />;
}

function EvolutionCardLink({
  id,
  name,
  image,
  draftMode,
  draftTab,
}: {
  id: string;
  name: string;
  image: string;
  draftMode?: boolean;
  draftTab?: "draft" | "shop";
}) {
  const imgUrl = getCardImageUrl({ id, name, localId: "", image }, "small");
  return (
    <Link
      to="/card/$cardId"
      params={{ cardId: id }}
      search={
        draftMode
          ? {
              draftMode: "1",
              draftTab,
            }
          : undefined
      }
      className="group relative block"
    >
      <div className="aspect-[2.5/3.5] rounded-2xl bg-blue-950/30 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03] relative">
        <img
          src={imgUrl}
          alt={name}
          className="w-full h-full object-contain transition-transform duration-300 group-hover:scale-[1.05]"
          loading="lazy"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              `https://placehold.co/245x337/1e1b4b/fff?text=No+Image`;
          }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-10">
          <div className="absolute inset-0 ring-2 ring-yellow-200/40" />
        </div>
      </div>
    </Link>
  );
}

function applyExclusionUpdate(
  exclusions: DraftPoolExclusion[],
  cardId: string,
  scope: "evolution" | "shop",
): DraftPoolExclusion[] {
  const existing = exclusions.find((item) => item.cardId === cardId);
  if (!existing) {
    return [...exclusions, { cardId, scope }];
  }
  if (existing.scope === scope) {
    return exclusions.filter((item) => item.cardId !== cardId);
  }
  if (existing.scope === "both") {
    const nextScope = scope === "evolution" ? "shop" : "evolution";
    return exclusions.map((item) =>
      item.cardId === cardId ? { ...item, scope: nextScope } : item,
    );
  }
  return exclusions.map((item) =>
    item.cardId === cardId ? { ...item, scope: "both" } : item,
  );
}
