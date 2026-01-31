import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@repo/ui/button";

export const Route = createFileRoute("/rules")({
  component: RulesPage,
});

function RulesPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-blue-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">
            ← Home
          </Link>
          <h1 className="text-lg font-semibold">Draft Pool Rules</h1>
          <Link to="/draft-pool" className="text-white/70 hover:text-white text-sm">
            Draft Pool
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
            Overview
          </p>
          <h2 className="text-2xl font-semibold">How the draft pool works</h2>
          <p className="text-white/70">
            The draft pool starts with a curated list of picks. Every pick automatically
            generates its evolution line and a shop of alternate versions. The pool is
            public to view, but only allowlisted Discord users can edit.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Draft Picks",
              description:
                "The core list. Picks are the only cards added manually by editors.",
            },
            {
              title: "Evolution Lines",
              description:
                "All related evolutions are auto-added from the pick’s Pokémon name.",
            },
            {
              title: "Shop Variants",
              description:
                "Alternate cards with the same Pokémon name are surfaced in the shop tab.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-5"
            >
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-white/70 mt-2">{item.description}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-4">
          <p className="text-xs uppercase tracking-[0.3em] text-yellow-200">
            Exclusions
          </p>
          <p className="text-white/70">
            Editors can exclude specific cards from the evolution or shop lists.
            Exclusions are applied automatically whenever the draft pool is viewed.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" asChild>
              <Link to="/draft-pool">View the draft pool</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/database">Browse the card database</Link>
            </Button>
          </div>
        </section>
      </main>
    </div>
  );
}
