import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReelsPage, type Reel } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { KEYS, get, set, getCoins, getAutoScroll } from "@/lib/storage";
import { AlertTriangle, RefreshCw, RotateCcw, X, Coins } from "lucide-react";

type ReelsSearch = { start?: string };

/** How many pages we keep in memory before evicting old ones from the front. */
const MAX_PAGES = 6;

export const Route = createFileRoute("/_app/reels")({
  validateSearch: (s: Record<string, unknown>): ReelsSearch => ({
    start: typeof s.start === "string" ? s.start : undefined,
  }),
  component: ReelsPage,
});

type PageData = { items: Reel[]; nextPage: number };
type FeedData = InfiniteData<PageData, number>;

function ReelsPage() {
  const { start } = Route.useSearch();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    setCoins(getCoins());
  }, []);

  const updateCoins = useCallback(() => {
    setCoins(getCoins());
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    error,
    refetch,
    isRefetching,
  } = useInfiniteQuery<PageData, Error, FeedData, [string], number>({
    queryKey: ["reels-feed"],
    queryFn: ({ pageParam }) => fetchReelsPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.items.length ? all.length + 1 : undefined),
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });

  const reels = useMemo<Reel[]>(() => {
    const all = data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    return all.filter((r) => {
      if (seen.has(r.id)) return false;
      seen.add(r.id);
      return true;
    });
  }, [data]);

  const containerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<Array<HTMLElement | null>>([]);
  const [activeIdx, setActiveIdx] = useState(0);
  const [muted, setMuted] = useState(true);
  const [resumeTarget, setResumeTarget] = useState<{ id: string; idx: number } | null>(null);
  const restoredRef = useRef<string | null>(null);
  const prevReelsLenRef = useRef(0);

  useEffect(() => {
    setMuted(get<boolean>(KEYS.muted, true));
  }, []);
  const toggleMute = () => {
    setMuted((m) => {
      const next = !m;
      set(KEYS.muted, next);
      return next;
    });
  };

  const scrollToIdx = useCallback((i: number, behavior: ScrollBehavior = "auto") => {
    const el = slideRefs.current[i];
    if (el) {
      el.scrollIntoView({ behavior });
      setActiveIdx(i);
    }
  }, []);

  // Deep-link handling: ?start=<id> — jump to that reel every time it changes
  // (works for hard refresh, client-nav, and browser back/forward).
  useEffect(() => {
    if (!start || reels.length === 0) return;
    const key = `start:${start}`;
    if (restoredRef.current === key) return;
    const i = reels.findIndex((r) => r.id === start);
    if (i >= 0) {
      restoredRef.current = key;
      // Defer to next tick so refs are mounted
      requestAnimationFrame(() => scrollToIdx(i, "auto"));
    } else if (hasNextPage && !isFetchingNextPage) {
      // Not found yet — keep loading more pages until it appears.
      fetchNextPage();
    }
  }, [start, reels, hasNextPage, isFetchingNextPage, fetchNextPage, scrollToIdx]);

  // Resume banner: on first entry without ?start=, surface a saved reel to jump to.
  useEffect(() => {
    if (start || resumeTarget !== null || restoredRef.current === "no-resume") return;
    if (reels.length === 0) return;
    const savedId = get<string | null>(KEYS.lastReelId, null);
    if (!savedId) {
      restoredRef.current = "no-resume";
      return;
    }
    const i = reels.findIndex((r) => r.id === savedId);
    if (i > 0) {
      restoredRef.current = "no-resume";
      setResumeTarget({ id: savedId, idx: i });
    } else if (i < 0 && hasNextPage && !isFetchingNextPage) {
      // Load more so we can find the saved reel
      fetchNextPage();
    } else if (i === 0) {
      restoredRef.current = "no-resume";
    }
  }, [start, reels, resumeTarget, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Observe active slide + persist
  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.7) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
            const r = reels[idx];
            if (r) {
              set(KEYS.lastReelId, r.id);
              set(KEYS.lastReelIdx, idx);
            }
          }
        });
      },
      { root, threshold: [0.7] }
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  // Prefetch upcoming pages aggressively so scrolling feels instant
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (reels.length - activeIdx <= 10) fetchNextPage();
  }, [activeIdx, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Idle-time warm fetch of one extra page
  useEffect(() => {
    if (reels.length === 0 || !hasNextPage || isFetchingNextPage) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const schedule = w.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 500));
    const id = schedule(() => fetchNextPage(), { timeout: 2000 });
    return () => {
      if (w.cancelIdleCallback) w.cancelIdleCallback(id as number);
      else window.clearTimeout(id as number);
    };
  }, [reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Safe cache eviction: cap in-memory pages. When we're deep enough into the
  // feed that the oldest page is far behind the viewer, drop the front pages
  // and correct scroll + activeIdx so nothing visibly jumps.
  useEffect(() => {
    const cache = data;
    if (!cache) return;
    if (cache.pages.length <= MAX_PAGES) return;

    // How far behind does the active reel sit? Only trim if pages 0..N are safely off-screen.
    const firstPageLen = cache.pages[0]?.items.length ?? 0;
    if (activeIdx < firstPageLen + 3) return; // keep a small buffer

    const droppedItems = firstPageLen;
    queryClient.setQueryData<FeedData>(["reels-feed"], (old) => {
      if (!old) return old;
      return {
        pages: old.pages.slice(1),
        pageParams: old.pageParams.slice(1),
      };
    });

    // Correct visual scroll so the currently-visible reel stays visible.
    const root = containerRef.current;
    if (root) {
      const slideH = root.clientHeight;
      root.scrollTop = Math.max(0, root.scrollTop - droppedItems * slideH);
    }
    setActiveIdx((i) => Math.max(0, i - droppedItems));
  }, [data, activeIdx, queryClient]);

  // Track reel-length changes to reset refs sizing
  useEffect(() => {
    prevReelsLenRef.current = reels.length;
    slideRefs.current.length = reels.length;
  }, [reels.length]);

  const goNext = useCallback(() => {
    scrollToIdx(activeIdx + 1, "smooth");
  }, [activeIdx, scrollToIdx]);

  const bumpWatched = useCallback(() => {
    const n = get<number>(KEYS.watched, 0);
    set(KEYS.watched, n + 1);
  }, []);

  const handleReelEnd = useCallback(() => {
    bumpWatched();
    // Auto-scroll to next reel after a short delay if enabled
    if (getAutoScroll()) {
      setTimeout(() => {
        if (activeIdx < reels.length - 1) {
          scrollToIdx(activeIdx + 1, "smooth");
        }
      }, 500);
    }
  }, [activeIdx, reels.length, scrollToIdx, bumpWatched]);

  const jumpToResume = () => {
    if (!resumeTarget) return;
    // Use current index by id in case eviction shifted it
    const i = reels.findIndex((r) => r.id === resumeTarget.id);
    if (i >= 0) scrollToIdx(i, "smooth");
    setResumeTarget(null);
    // Reflect the deep link in the URL so back/forward returns here
    navigate({ to: "/reels", search: { start: resumeTarget.id }, replace: true });
  };

  if (isError && reels.length === 0) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-dusk-indigo px-6">
        <div className="max-w-sm rounded-lg border border-periwinkle-sky/40 bg-white/5 p-6 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <AlertTriangle className="h-6 w-6 text-cream-linen" />
          </div>
          <h2 className="text-lg font-semibold text-cream-linen">Can't load reels</h2>
          <p className="mt-2 text-sm text-cream-linen/70">
            {(error as Error)?.message ??
              "Something went wrong. Please check your connection and try again."}
          </p>
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full border border-cream-linen bg-transparent px-5 py-2 text-sm font-medium text-cream-linen transition hover:bg-cream-linen hover:text-dusk-indigo disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`} />
            {isRefetching ? "Retrying…" : "Try again"}
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative h-[100dvh] w-full overflow-hidden bg-dusk-indigo">
        {/* Shimmer skeletons stacked like reel slides */}
        <div className="absolute inset-0 flex flex-col">
          {[0, 1].map((k) => (
            <div key={k} className="relative h-1/2 w-full overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-white/10 to-white/5" />
              <div className="skeleton-shimmer absolute inset-0" />
              <div className="absolute bottom-6 left-4 right-20 space-y-2">
                <div className="h-3 w-2/3 rounded bg-white/10" />
                <div className="h-3 w-1/2 rounded bg-white/10" />
              </div>
              <div className="absolute bottom-16 right-3 flex flex-col gap-4">
                <div className="h-10 w-10 rounded-full bg-white/10" />
                <div className="h-10 w-10 rounded-full bg-white/10" />
              </div>
            </div>
          ))}
        </div>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-periwinkle-sky/40 border-t-periwinkle-sky" />
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="no-scrollbar relative h-[100dvh] snap-y snap-mandatory overflow-y-scroll bg-dusk-indigo"
    >
      {/* Coins display */}
      <div className="fixed top-4 right-4 z-30 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur md:top-6 md:right-auto md:left-[calc(244px+1rem)]">
        <Coins className="h-5 w-5 text-yellow-400" />
        <span className="text-sm font-semibold text-white">{coins}</span>
      </div>

      {/* Resume watching banner */}
      {resumeTarget && (
        <div className="pointer-events-none fixed left-1/2 top-4 z-30 w-[min(92vw,420px)] -translate-x-1/2 md:top-6">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-twilight-navy bg-cloud-white px-4 py-2 shadow-[0_2px_18px_rgba(10,10,58,0.25)]">
            <RotateCcw className="h-4 w-4 text-cobalt-pop" />
            <div className="min-w-0 flex-1 text-sm text-twilight-navy">
              <span className="font-medium">resume watching</span>
              <span className="ml-1 text-slate-mist">— pick up where you left off</span>
            </div>
            <button
              onClick={jumpToResume}
              className="rounded-full border border-twilight-navy bg-transparent px-3 py-1 text-xs font-medium uppercase tracking-wider text-twilight-navy transition hover:bg-periwinkle-sky"
            >
              jump back
            </button>
            <button
              onClick={() => setResumeTarget(null)}
              aria-label="Dismiss"
              className="text-slate-mist hover:text-twilight-navy"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {reels.map((r, i) => {
        const near = Math.abs(i - activeIdx) <= 3;
        const composite = `reel::${r.source}::${r.id}::${i}`;
        return (
          <section
            key={composite}
            data-idx={i}
            data-reel-id={r.id}
            ref={(el) => { slideRefs.current[i] = el; }}
            className="relative h-[100dvh] w-full snap-start snap-always"
          >
            {near ? (
              <ReelPlayer
                key={`player::${r.id}`}
                reel={r}
                active={i === activeIdx}
                muted={muted}
                onToggleMute={toggleMute}
                onEnded={handleReelEnd}
                onWatched={bumpWatched}
                onCoinsUpdate={updateCoins}
              />
            ) : (
              <div key={`ph::${r.id}`} className="h-full w-full bg-dusk-indigo">
                {r.thumbnail && (
                  <img src={r.thumbnail} alt="" className="h-full w-full object-cover opacity-40" loading="lazy" />
                )}
              </div>
            )}
          </section>
        );
      })}
      {isFetchingNextPage && (
        <div className="flex h-24 items-center justify-center bg-dusk-indigo">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-periwinkle-sky/40 border-t-periwinkle-sky" />
        </div>
      )}
      {isError && reels.length > 0 && (
        <div className="flex h-24 flex-col items-center justify-center gap-2 bg-dusk-indigo px-6 text-sm text-cream-linen/80">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-cream-linen" />
            <span>Couldn't load more reels.</span>
          </div>
          <button
            onClick={() => fetchNextPage()}
            className="inline-flex items-center gap-1 rounded-full border border-periwinkle-sky/60 px-3 py-1 text-cream-linen hover:bg-periwinkle-sky/20"
          >
            <RefreshCw className="h-3 w-3" /> Retry
          </button>
        </div>
      )}
    </div>
  );
}
