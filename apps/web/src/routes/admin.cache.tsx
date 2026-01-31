import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import {
  fetchCacheStatus,
  triggerCacheWarm,
  type CacheStatusResponse,
} from "../api/cache-status";
import { Button } from "@repo/ui/button";

export const Route = createFileRoute("/admin/cache")({
  component: AdminCachePage,
});

const WARM_INTERVAL_MS = 2500;

function AdminCachePage() {
  const queryClient = useQueryClient();
  const statusQuery = useQuery({
    queryKey: ["cache-status"],
    queryFn: fetchCacheStatus,
    refetchInterval: (query) =>
      query.state.data?.phase !== "done" && query.state.data?.phase !== "idle"
        ? 2000
        : false,
  });
  const warmMutation = useMutation({
    mutationFn: triggerCacheWarm,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cache-status"] });
    },
  });

  const status = statusQuery.data;
  const phase = status?.phase ?? "idle";
  const isWarming = phase === "sets" || phase === "cards";
  const isDone = phase === "done";
  const warmingRef = useRef(false);

  useEffect(() => {
    if (phase !== "sets" && phase !== "cards") return;
    const intervalId = setInterval(async () => {
      const data = queryClient.getQueryData<CacheStatusResponse>(["cache-status"]);
      if (data?.phase !== "sets" && data?.phase !== "cards") return;
      if (warmingRef.current) return;
      warmingRef.current = true;
      try {
        await warmMutation.mutateAsync();
      } catch {
        // ignore; status will show lastError
      } finally {
        warmingRef.current = false;
      }
      await queryClient.refetchQueries({ queryKey: ["cache-status"] });
    }, WARM_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [phase, queryClient, warmMutation.mutateAsync]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-950 via-indigo-950 to-zinc-950 text-white">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-blue-950/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="text-white/70 hover:text-white text-sm">
            ← Home
          </Link>
          <h1 className="text-lg font-semibold">TCG Pocket cache</h1>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <p className="text-white/70 text-sm">
          This page warms the app cache in small chunks so the worker stays under
          Cloudflare subrequest limits. Once complete, the database page and
          card APIs use cached data (including rarity) without hitting TCGdex
          repeatedly.
        </p>

        {statusQuery.isError && (
          <div className="rounded-2xl border border-red-500/50 bg-red-950/20 px-6 py-4 text-red-200">
            Failed to load status: {String(statusQuery.error?.message)}
          </div>
        )}

        {status && (
          <>
            <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-200">
                Status
              </h2>
              <dl className="grid gap-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-white/70">Phase</dt>
                  <dd className="font-medium">{phase}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/70">Sets</dt>
                  <dd>
                    {status.sets.cached} / {status.sets.total} cached
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-white/70">Cards</dt>
                  <dd>
                    {status.cards.cached} / {status.cards.total} cached
                  </dd>
                </div>
                {status.lastError && (
                  <div className="col-span-2 rounded-lg bg-red-950/30 px-3 py-2 text-red-200 text-xs">
                    Last error: {status.lastError}
                  </div>
                )}
                {status.updatedAt && (
                  <div className="flex justify-between gap-4 text-white/50 text-xs">
                    <dt>Updated</dt>
                    <dd>{status.updatedAt}</dd>
                  </div>
                )}
              </dl>
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-200">
                What will be stored
              </h2>
              <p className="text-white/70 text-sm">
                The cache stores all TCG Pocket sets (id, name, logo, card
                list) and every card with full detail (rarity, etc.) from
                TCGdex. Set IDs to fetch: {status.sets.wantedIds.length}. Card
                IDs to fetch: {status.cards.wantedIds.length}.
              </p>
              {status.sets.wantedIds.length > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-white/70 hover:text-white">
                    Set IDs ({status.sets.wantedIds.length})
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-y-auto list-disc list-inside text-white/60">
                    {status.sets.wantedIds.slice(0, 50).map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                    {status.sets.wantedIds.length > 50 && (
                      <li>… and {status.sets.wantedIds.length - 50} more</li>
                    )}
                  </ul>
                </details>
              )}
              {status.cards.wantedIds.length > 0 && status.sets.total > 0 && (
                <details className="text-sm">
                  <summary className="cursor-pointer text-white/70 hover:text-white">
                    Card IDs ({status.cards.wantedIds.length})
                  </summary>
                  <ul className="mt-2 max-h-40 overflow-y-auto list-disc list-inside text-white/60">
                    {status.cards.wantedIds.slice(0, 30).map((id) => (
                      <li key={id}>{id}</li>
                    ))}
                    {status.cards.wantedIds.length > 30 && (
                      <li>
                        … and {status.cards.wantedIds.length - 30} more
                      </li>
                    )}
                  </ul>
                </details>
              )}
            </section>

            <section className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-yellow-200">
                Actions
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  onClick={() => warmMutation.mutate()}
                  disabled={statusQuery.isLoading || warmMutation.isPending || isDone}
                >
                  {warmMutation.isPending
                    ? "Warming…"
                    : isDone
                      ? "Cache complete"
                      : isWarming
                        ? "Warming… (auto)"
                        : "Start warming cache"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["cache-status"] })}
                  disabled={statusQuery.isFetching}
                >
                  Refresh status
                </Button>
              </div>
              {isWarming && (
                <p className="text-white/60 text-sm">
                  Running the next chunk every ~2.5s; status auto-refreshes. Leave
                  this page open until phase is done.
                </p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
