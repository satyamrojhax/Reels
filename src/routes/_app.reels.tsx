import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient, type InfiniteData, useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReelsPage, warmAllFilters, CATEGORIES, type Reel, type FeedFilter } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { KEYS, get, set, getCoins, getAutoScroll, getLiked, getSaved } from "@/lib/storage";
import { warmCacheOnStartup } from "@/lib/video-cache";
import { useVideoPrewarmer } from "@/hooks/use-video-prewarmer";
import { AlertTriangle, RefreshCw, RotateCcw, X, Coins, ChevronUp, ChevronDown } from "lucide-react";

type ReelsSearch = { start?: string; tabs?: FeedFilter };

/** How many pages we keep in memory before evicting old ones from the front. */
const MAX_PAGES = 6;

export const Route = createFileRoute("/_app/reels")({
  validateSearch: (s: Record<string, unknown>): ReelsSearch => ({
    start: typeof s.start === "string" ? s.start : undefined,
    tabs: typeof s.tabs === "string" ? (s.tabs as FeedFilter) : undefined,
  }),
  component: ReelsPage,
});

type PageData = { items: Reel[]; nextPage: number };
type FeedData = InfiniteData<PageData, number>;

// Warm cache + all filter tabs once — called outside component so it's truly
// run once per page load, not on every re-render.
let warmupStarted = false;
function ensureWarmedUp() {
  if (warmupStarted) return;
  warmupStarted = true;
  warmCacheOnStartup().catch(() => {});
  // Warm pages 1–2 of all four tabs in the background
  warmAllFilters();
}
ensureWarmedUp();

function ReelsPage() {
  const search = Route.useSearch();
  const { start, tabs } = search;
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [coins, setCoins] = useState(0);

  const filter = tabs || "all";

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
    // 30 min stale-time: tab switches hit the cache, not the network
    staleTime: filter === "latest" ? 0 : 30 * 60_000,
    gcTime: 60 * 60_000,
    retry: 3,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
  });

  const reels = useMemo<Reel[]>(() => {
    const all = data?.pages.flatMap((p) => p.items) ?? [];
    const seen = new Set<string>();
    const finalReels: Reel[] = [];

    if (start && all.findIndex((r) => r.id === start) === -1) {
      const likedAndSaved = [...getLiked(), ...getSaved()];
      const target = likedAndSaved.find((r) => r.id === start);
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

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      set(KEYS.muted, next);
      return next;
    });
  }, []);

  const scrollToIdx = useCallback((i: number, behavior: ScrollBehavior = "auto") => {
    const el = slideRefs.current[i];
    if (el) {
      el.scrollIntoView({ behavior });
      setActiveIdx(i);
    }
  }, []);

  // Deep-link: jump to ?start=<id>
  useEffect(() => {
    if (!start || reels.length === 0) return;
    const key = `start:${start}`;
    if (restoredRef.current === key) return;
    const i = reels.findIndex((r) => r.id === start);
    if (i >= 0) {
      restoredRef.current = key;
      requestAnimationFrame(() => scrollToIdx(i, "auto"));
    } else if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [start, reels, hasNextPage, isFetchingNextPage, fetchNextPage, scrollToIdx]);

  // Resume banner
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
      { root, threshold: [0.7] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  // Aggressive prefetch — start loading the next page when 15 reels remain
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (reels.length - activeIdx <= 15) fetchNextPage();
  }, [activeIdx, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Safe cache eviction: cap in-memory pages
  useEffect(() => {
    const cache = data;
    if (!cache) return;
    if (cache.pages.length <= MAX_PAGES) return;

    const firstPageLen = cache.pages[0]?.items.length ?? 0;
    if (activeIdx < firstPageLen + 3) return;

    const droppedItems = firstPageLen;
    queryClient.setQueryData<FeedData>(["reels-feed", filter], (old) => {
      if (!old) return old;
      return {
        pages: old.pages.slice(1),
        pageParams: old.pageParams.slice(1),
      };
    });

    const root = containerRef.current;
    if (root) {
      const slideH = root.clientHeight;
      root.scrollTop = Math.max(0, root.scrollTop - droppedItems * slideH);
    }
    setActiveIdx((i) => Math.max(0, i - droppedItems));
  }, [data, activeIdx, queryClient, filter]);

  // Pre-warm CDN connections for upcoming reels
  useVideoPrewarmer(reels, activeIdx);

  // Track reel-length changes to resize refs array
  useEffect(() => {
    prevReelsLenRef.current = reels.length;
    slideRefs.current.length = reels.length;
  }, [reels.length]);

  const goNext = useCallback(() => {
    scrollToIdx(activeIdx + 1, "smooth");
  }, [activeIdx, scrollToIdx]);
  void goNext; // exported for future use

  const bumpWatched = useCallback(() => {
    const n = get<number>(KEYS.watched, 0);
    set(KEYS.watched, n + 1);
  }, []);

  const handleReelEnd = useCallback(() => {
    bumpWatched();
    if (getAutoScroll()) {
      setTimeout(() => {
        if (activeIdx < reels.length - 1) {
          scrollToIdx(activeIdx + 1, "smooth");
          if (typeof navigator !== "undefined" && navigator.vibrate)
            navigator.vibrate([30, 50, 30]);
        }
      }, 500);
    }
  }, [activeIdx, reels.length, scrollToIdx, bumpWatched]);

  const jumpToResume = () => {
    if (!resumeTarget) return;
    const i = reels.findIndex((r) => r.id === resumeTarget.id);
    if (i >= 0) scrollToIdx(i, "smooth");
    setResumeTarget(null);
    navigate({ to: "/reels", search: { start: resumeTarget.id }, replace: true });
  };

  // ─── Error & Loading States ────────────────────────────────────────────────

  if (isError && reels.length === 0) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background text-foreground px-6">
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
      <div className="relative h-[100dvh] w-full bg-background overflow-hidden flex items-center justify-center">
        <div className="flex gap-2">
          {[0, 150, 300].map((d) => (
            <div key={d} className="h-3 w-3 animate-bounce rounded-full bg-white shadow-lg" style={{ animationDelay: `${d}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Main Feed ─────────────────────────────────────────────────────────────

  return (
    <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
      {/* Category Pills */}
      <div className="absolute left-0 right-0 top-14 z-30 flex w-full justify-center px-4 md:top-6 md:justify-end md:pr-8 pointer-events-none">
        <div className="no-scrollbar flex items-center justify-center gap-2 overflow-x-auto sm:gap-3 pointer-events-auto">
          {(["all", "latest", "local", "trending"] as string[]).map((f) => (
            <button
              key={f}
              onClick={() => navigate({ search: (prev) => ({ ...prev, tabs: f as FeedFilter }), replace: true })}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider transition sm:px-4 sm:text-xs ${
                filter === f
                  ? "bg-foreground text-background"
                  : "bg-background/80 text-foreground border border-border/60 backdrop-blur hover:bg-muted"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Coins display */}
      <div className="absolute top-4 left-4 z-30 flex items-center gap-2 rounded-full bg-background/80 border border-border/50 px-3 py-1.5 backdrop-blur md:top-6 md:left-6">
        <Coins className="h-5 w-5 text-yellow-500" />
        <span className="text-sm font-semibold text-foreground">{coins}</span>
      </div>

      {/* Desktop Navigation Arrows */}
      <div className="absolute right-8 top-1/2 z-40 hidden -translate-y-1/2 flex-col gap-4 md:flex">
        <button
          onClick={() => activeIdx > 0 && scrollToIdx(activeIdx - 1, "smooth")}
          disabled={activeIdx === 0}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-mist/20 dark:bg-white/10 text-twilight-navy dark:text-cream-linen transition hover:bg-slate-mist/30 dark:hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
        >
          <ChevronUp className="h-6 w-6" />
        </button>
        <button
          onClick={() => activeIdx < reels.length - 1 && scrollToIdx(activeIdx + 1, "smooth")}
          disabled={activeIdx === reels.length - 1}
          className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-mist/20 dark:bg-white/10 text-twilight-navy dark:text-cream-linen transition hover:bg-slate-mist/30 dark:hover:bg-white/20 disabled:opacity-20 disabled:cursor-not-allowed backdrop-blur"
        >
          <ChevronDown className="h-6 w-6" />
        </button>
      </div>

      <div
        ref={containerRef}
        className="no-scrollbar h-full w-full snap-y snap-mandatory overflow-y-scroll"
      >



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
        // Render the player for reels within distance 3; beyond that show thumbnail placeholder
        const near = Math.abs(i - activeIdx) <= 3;
        const composite = `reel::${r.source}::${r.id}::${i}`;
        return (
          <section
            key={composite}
            data-idx={i}
            data-reel-id={r.id}
            ref={(el) => {
              slideRefs.current[i] = el;
            }}
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
                feedType={filter}
              />
            ) : (
              <div key={`ph::${r.id}`} className="h-full w-full bg-background">
                {r.thumbnail && (
                  <img
                    src={r.thumbnail}
                    alt=""
                    className="h-full w-full object-cover opacity-40"
                    loading="lazy"
                  />
                )}
              </div>
            )}
          </section>
        );
      })}

      {isFetchingNextPage && (
        <div className="flex h-24 items-center justify-center bg-background">
          <div className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-periwinkle-sky" style={{ animationDelay: "0ms" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-periwinkle-sky" style={{ animationDelay: "150ms" }} />
            <div className="h-2.5 w-2.5 animate-bounce rounded-full bg-periwinkle-sky" style={{ animationDelay: "300ms" }} />
          </div>
        </div>
      )}
      {isError && reels.length > 0 && (
        <div className="flex h-24 flex-col items-center justify-center gap-2 bg-background px-6 text-sm text-muted-foreground">
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
    </div>
  );
}
