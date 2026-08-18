import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReelsPage, type Reel, type FeedFilter } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { KEYS, get, set, getCoins, getAutoScroll, getLiked, getSaved } from "@/lib/storage";
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
  const [filter, setFilter] = useState<FeedFilter>("all");

  useEffect(() => {
    setCoins(getCoins());
    const handleCoinsChange = () => setCoins(getCoins());
    window.addEventListener("coins-change", handleCoinsChange);
    return () => window.removeEventListener("coins-change", handleCoinsChange);
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
  } = useInfiniteQuery<PageData, Error, FeedData, [string, FeedFilter], number>({
    queryKey: ["reels-feed", filter],
    queryFn: ({ pageParam }) => fetchReelsPage(pageParam, filter),
    initialPageParam: 1,
    getNextPageParam: (last) => last.nextPage,
    staleTime: 10 * 60_000,
    gcTime: 30 * 60_000,
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });

  const reels = useMemo<Reel[]>(() => {
    const all = data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    const finalReels: Reel[] = [];

    if (start && all.findIndex(r => r.id === start) === -1) {
       const likedAndSaved = [...getLiked(), ...getSaved()];
       const target = likedAndSaved.find(r => r.id === start);
       if (target) {
         finalReels.push(target);
         seen.add(target.id);
       }
    }

    for (const r of all) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      finalReels.push(r);
    }
    return finalReels;
  }, [data, start]);

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
    queryClient.setQueryData<FeedData>(["reels-feed", filter], (old) => {
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
  }, [data, activeIdx, queryClient, filter]);

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
          if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate([30, 50, 30]);
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
      <div className="relative h-[100dvh] w-full overflow-hidden bg-black">
        <div className="absolute inset-0 animate-pulse bg-zinc-900" />
        
        {/* Right action buttons skeleton */}
        <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-6">
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
          <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
        </div>
        
        {/* Bottom text skeleton */}
        <div className="absolute inset-x-0 bottom-0 z-10 p-4 pr-20 pb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="h-10 w-10 animate-pulse rounded-full bg-zinc-800" />
            <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
          </div>
          <div className="space-y-3">
            <div className="h-3 w-3/4 animate-pulse rounded bg-zinc-800" />
            <div className="h-3 w-1/2 animate-pulse rounded bg-zinc-800" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="no-scrollbar relative h-[100dvh] snap-y snap-mandatory overflow-y-scroll bg-dusk-indigo"
    >
      {/* Category Pills */}
      <div className="absolute left-0 right-0 top-16 z-30 flex w-full justify-center px-4 md:top-6">
        <div className="no-scrollbar flex w-full max-w-full items-center justify-start gap-2 overflow-x-auto sm:justify-center sm:gap-3">
          {(["all", "local", "trending"] as FeedFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition sm:px-4 sm:text-xs sm:tracking-widest ${
                filter === f
                  ? "bg-white text-black"
                  : "bg-black/50 text-white backdrop-blur hover:bg-black/70"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Coins display */}
      <div className="fixed top-4 left-4 z-30 flex items-center gap-2 rounded-full bg-black/50 px-3 py-1.5 backdrop-blur md:top-6 md:left-[calc(244px+1rem)]">
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
                distance={Math.abs(i - activeIdx)}
                muted={muted}
                onToggleMute={toggleMute}
                onEnded={handleReelEnd}
                onWatched={bumpWatched}
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
