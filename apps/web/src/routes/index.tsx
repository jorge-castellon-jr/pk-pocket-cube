import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@repo/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 h-72 w-72 rounded-full bg-yellow-400/20 blur-3xl" />
        <div className="absolute top-20 right-0 h-96 w-96 rounded-full bg-blue-500/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-rose-500/20 blur-3xl" />
      </div>
      <header className="relative z-10 max-w-6xl mx-auto px-6 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-tr from-yellow-300 to-red-500 shadow-lg" />
          <span className="font-semibold tracking-wide">Pokémon TCG Pocket</span>
        </div>
        <Link
          to="/login"
          className="text-sm text-white/70 hover:text-white transition"
        >
          Login
        </Link>
      </header>

      <main className="relative z-10 max-w-5xl mx-auto px-6 py-16 text-center flex flex-col gap-10">
        <div className="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm uppercase tracking-[0.2em] text-yellow-200">
          Official-Style Archive
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight drop-shadow-sm">
          The Pokémon TCG Pocket
          <span className="block bg-gradient-to-r from-yellow-200 via-amber-300 to-rose-300 bg-clip-text text-transparent">
            Card Database
          </span>
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
          Discover every card, every set, and every expansion from Pokémon TCG
          Pocket in one polished, official-style archive.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button variant="primary" size="lg" asChild>
            <Link to="/database">Enter the Database</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/draft-pool">View Draft Pool</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link to="/rules">Draft Rules</Link>
          </Button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-10 text-left">
          {[
            {
              title: "Curated Set Library",
              description: "Browse every TCG Pocket release with official names.",
            },
            {
              title: "High-Fidelity Art",
              description: "Official card imagery served in optimized formats.",
            },
            {
              title: "Fast, Modern UI",
              description: "Built for collectors, fans, and competitive players.",
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-white/10 bg-white/5 px-6 py-5 shadow-lg"
            >
              <h3 className="font-semibold text-lg">{item.title}</h3>
              <p className="text-sm text-white/70 mt-2">{item.description}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
