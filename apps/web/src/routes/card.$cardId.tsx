import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  fetchTCGPocketCardById,
  getCardImageUrl,
  type TCGdexCardDetail,
} from "../api/tcgdex";
import { Button } from "@repo/ui/button";

export const Route = createFileRoute("/card/$cardId")({
  component: CardDetailPage,
});

function CardDetailPage() {
  const { cardId } = Route.useParams();
  const cardQuery = useQuery({
    queryKey: ["tcgpocket", "card", cardId],
    queryFn: () => fetchTCGPocketCardById(cardId),
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
  const imgUrl = getCardImageUrl(card, "large");

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-white/10 bg-blue-950/80 backdrop-blur">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/database" className="text-white/70 hover:text-white text-sm">
            ← Back to database
          </Link>
          <h1 className="text-lg font-semibold">{card.name}</h1>
          <span className="text-sm text-white/70">{card.set?.name ?? "TCG Pocket"}</span>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-10 grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-10">
        <div className="flex items-center justify-center">
          <img
            src={imgUrl}
            alt={card.name}
            className="w-full object-contain drop-shadow-2xl"
            onError={(e) => {
              (e.target as HTMLImageElement).src = `https://placehold.co/600x825/1e1b4b/fff?text=No+Image`;
            }}
          />
        </div>
        <div className="space-y-6">
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
            <Detail label="Rarity" value={card.rarity} />
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
                  <div key={`${attack.name ?? "attack"}-${idx}`} className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{attack.name}</span>
                      {attack.damage && (
                        <span className="text-yellow-200">{attack.damage}</span>
                      )}
                    </div>
                    {attack.cost && attack.cost.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {attack.cost.map((cost, costIndex) => (
                          <span
                            key={`${cost}-${costIndex}`}
                            title={cost}
                            aria-label={cost}
                            className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${getCostIconClass(cost)}`}
                          >
                            <span className="text-[11px] leading-none">
                              {getCostIcon(cost)}
                            </span>
                            <span className="sr-only">{cost}</span>
                          </span>
                        ))}
                      </div>
                    )}
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

function getCostIcon(cost: string) {
  const normalized = cost.toLowerCase();
  switch (normalized) {
    case "grass":
      return "🌿";
    case "fire":
      return "🔥";
    case "water":
      return "💧";
    case "lightning":
      return "⚡";
    case "psychic":
      return "🔮";
    case "fighting":
      return "🥊";
    case "darkness":
      return "🌑";
    case "metal":
      return "⚙";
    case "dragon":
      return "🐉";
    case "colorless":
      return "◇";
    default:
      return "•";
  }
}
