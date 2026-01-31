import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, type ReactNode } from "react";
import {
  fetchDraftPool,
  updateDraftPoolExclusions,
  updateDraftPoolPicks,
  type DraftPoolExclusion,
} from "../api/draft-pool";
import { getCardImageUrl } from "../api/tcgdex";
import { Button } from "@repo/ui/button";

export const Route = createFileRoute("/draft-pool")({
  component: DraftPoolPage,
});

const tabs = ["draft", "shop"] as const;
type TabKey = (typeof tabs)[number];

function DraftPoolPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("draft");
  const queryClient = useQueryClient();
  const draftPoolQuery = useQuery({
    queryKey: ["draft-pool"],
    queryFn: fetchDraftPool,
  });

  const updatePicksMutation = useMutation({
    mutationFn: updateDraftPoolPicks,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draft-pool"] }),
  });
  const updateExclusionsMutation = useMutation({
    mutationFn: updateDraftPoolExclusions,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["draft-pool"] }),
  });

  const picks = draftPoolQuery.data?.picks ?? [];
  const exclusions = draftPoolQuery.data?.exclusions ?? [];
  const evolutionsByPick = draftPoolQuery.data?.evolutionsByPick ?? {};
  const shopByPick = draftPoolQuery.data?.shopByPick ?? {};
  const isEditor = draftPoolQuery.data?.isEditor ?? false;
  const exclusionMap = useMemo(
    () => new Map(exclusions.map((item) => [item.cardId, item.scope])),
    [exclusions],
  );

  const handleRemovePick = (cardId: string) => {
    const nextIds = picks.filter((pick) => pick.id !== cardId).map((pick) => pick.id);
    updatePicksMutation.mutate(nextIds);
  };

  const handleToggleExclusion = (cardId: string, scope: "evolution" | "shop") => {
    const next = applyExclusionUpdate(exclusions, cardId, scope);
    updateExclusionsMutation.mutate(next);
  };

  if (draftPoolQuery.isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex items-center justify-center">
        <p className="text-white/70">Loading draft pool…</p>
      </div>
    );
  }

  if (draftPoolQuery.isError) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white flex flex-col items-center justify-center gap-4">
        <p className="text-red-300">
          Failed to load draft pool: {String(draftPoolQuery.error?.message)}
        </p>
        <Button variant="outline" asChild>
          <Link to="/">Back to home</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-blue-950/90 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">
            ← Home
          </Link>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              Draft Pool
            </p>
            <h1 className="text-lg font-semibold">TCG Pocket Draft</h1>
          </div>
          <Link to="/rules" className="text-white/70 hover:text-white text-sm">
            Rules
          </Link>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-10 space-y-10">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <p className="text-sm text-white/60">Public draft pool</p>
              <p className="text-lg font-semibold">
                Picks, evolutions, and shop variants
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" asChild>
                <Link to="/database" search={{ draftMode: "1" }}>
                  Browse cards (draft mode)
                </Link>
              </Button>
              {isEditor && (
                <span className="text-xs uppercase tracking-[0.2em] text-emerald-200">
                  Editor Access
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-full text-xs uppercase tracking-[0.2em] border transition ${
                  activeTab === tab
                    ? "border-yellow-200/70 bg-yellow-200/15 text-yellow-100"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                {tab === "draft" ? "Draft Pool" : "Shop"}
              </button>
            ))}
          </div>
        </section>

        <section className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              Draft Picks
            </p>
            <p className="text-white/70 text-sm mt-2">
              Core cards that drive the evolution and shop pools.
            </p>
          </div>
          {picks.length === 0 ? (
            <p className="text-white/60 text-sm">
              No draft picks yet. Editors can add picks from draft-mode card pages.
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {picks.map((card) => (
                <DraftCardTile
                  key={card.id}
                  card={card}
                  draftTab={activeTab}
                  actions={
                    isEditor ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemovePick(card.id)}
                      >
                        Remove
                      </Button>
                    ) : null
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="space-y-8">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
              {activeTab === "draft" ? "Evolution Lines" : "Shop Variants"}
            </p>
            <p className="text-white/70 text-sm mt-2">
              {activeTab === "draft"
                ? "Automatically generated evolution lines for each pick."
                : "Alternate cards with the same Pokémon name."}
            </p>
          </div>

          {picks.length === 0 ? (
            <p className="text-white/60 text-sm">
              Add picks to populate the {activeTab === "draft" ? "evolutions" : "shop"} list.
            </p>
          ) : (
            <div className="space-y-10">
              {picks.map((pick) => {
                const groupCards =
                  activeTab === "draft"
                    ? evolutionsByPick[pick.id] ?? []
                    : shopByPick[pick.id] ?? [];
                return (
                  <div key={pick.id} className="space-y-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={getCardImageUrl(pick, "small")}
                        alt={pick.name}
                        className="h-12 w-12 rounded-lg object-contain"
                      />
                      <div>
                        <p className="text-sm text-white/60 uppercase tracking-[0.2em]">
                          {pick.name}
                        </p>
                        <p className="text-xs text-white/50">{pick.setName}</p>
                      </div>
                    </div>
                    {groupCards.length === 0 ? (
                      <p className="text-white/50 text-sm">
                        No cards available after exclusions.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {groupCards.map((card) => {
                          const scope = exclusionMap.get(card.id);
                          const isExcluded =
                            activeTab === "draft"
                              ? scope === "evolution" || scope === "both"
                              : scope === "shop" || scope === "both";
                          return (
                            <DraftCardTile
                              key={card.id}
                              card={card}
                              draftTab={activeTab}
                              actions={
                                isEditor ? (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleToggleExclusion(
                                        card.id,
                                        activeTab === "draft" ? "evolution" : "shop",
                                      )
                                    }
                                  >
                                    {isExcluded ? "Undo Exclude" : "Exclude"}
                                  </Button>
                                ) : null
                              }
                            />
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function DraftCardTile({
  card,
  actions,
  draftTab,
}: {
  card: { id: string; name: string; localId: string; image?: string; setName: string };
  actions?: ReactNode;
  draftTab: TabKey;
}) {
  const imgUrl = getCardImageUrl(card, "small");
  return (
    <div className="space-y-2">
      <Link
        to="/card/$cardId"
        params={{ cardId: card.id }}
        search={{ draftMode: "1", draftTab }}
        className="group relative block"
      >
        <div className="aspect-[2.5/3.5] rounded-2xl bg-blue-950/30 transition-transform duration-300 group-hover:-translate-y-1 group-hover:scale-[1.03] relative">
          <img
            src={imgUrl}
            alt={card.name}
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
      <div className="space-y-2">
        <div>
          <p className="text-xs text-white/70">{card.name}</p>
          <p className="text-[10px] text-white/40 uppercase tracking-[0.2em]">
            {card.setName}
          </p>
        </div>
        {actions}
      </div>
    </div>
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
