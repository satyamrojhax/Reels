import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useInfiniteQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { fetchReelsPage, CATEGORIES, type Reel, type FeedFilter } from "@/lib/reels";
import { ReelPlayer } from "@/components/reel-player";
import { KEYS, get, set, getCoins, getAutoScroll, getLiked, getSaved } from "@/lib/storage";
import { useVideoPrewarmer } from "@/hooks/use-video-prewarmer";
import { AlertTriangle, RefreshCw, Coins, ChevronUp, ChevronDown } from "lucide-react";

type CategorySearch = { c?: string; start?: string };

const MAX_PAGES = 6;

export const Route = createFileRoute("/_app/category")({
  validateSearch: (s: Record<string, unknown>): CategorySearch => ({
    c: typeof s.c === "string" ? s.c : undefined,
    start: typeof s.start === "string" ? s.start : undefined,
  }),
  component: CategoryPage,
});

type PageData = { items: Reel[]; nextPage: number };
type FeedData = InfiniteData<PageData, number>;

function CategoryPage() {
  const search = Route.useSearch();
  const { start, c } = search;
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();
  const [coins, setCoins] = useState(0);

  const categoryParam = c || "Explore";
  const filter: FeedFilter = `category:${categoryParam}`;

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
    staleTime: categoryParam === "Explore" ? 0 : 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnMount: categoryParam === "Explore" ? "always" : true,
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

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio >= 0.7) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setActiveIdx(idx);
          }
        });
      },
      { root, threshold: [0.7] },
    );
    slideRefs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, [reels]);

  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return;
    if (reels.length - activeIdx <= 15) fetchNextPage();
  }, [activeIdx, reels.length, hasNextPage, isFetchingNextPage, fetchNextPage]);

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

  useVideoPrewarmer(reels, activeIdx);

  useEffect(() => {
    prevReelsLenRef.current = reels.length;
    slideRefs.current.length = reels.length;
  }, [reels.length]);

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

  if (isError && reels.length === 0) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-background text-foreground px-6">
        <div className="max-w-sm rounded-lg border border-periwinkle-sky/40 bg-white/5 p-6 text-center backdrop-blur">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/10">
            <AlertTriangle className="h-6 w-6 text-cream-linen" />
          </div>
          <h2 className="text-lg font-semibold text-cream-linen">Can't load reels</h2>
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

  return (
    <div className="relative h-[100dvh] w-full bg-background overflow-hidden">
      {/* Categories Dropdown — top right on desktop, top center on mobile */}
      <div className="absolute left-0 right-0 top-4 z-30 flex justify-center px-4 md:top-6 md:justify-end md:pr-8 pointer-events-none">
        <div className="relative flex items-center justify-center pointer-events-auto">
          <select
            value={categoryParam}
            onChange={(e) => {
              const val = e.target.value;
              if (val) {
                if (val === "Explore") {
                  queryClient.invalidateQueries({ queryKey: ["reels-feed", "Explore"] });
                }
                navigate({ search: (prev) => ({ ...prev, c: val }), replace: true });
              }
            }}
            className="appearance-none bg-background text-foreground border border-border px-4 pr-8 py-2 text-xs md:text-sm font-bold uppercase tracking-wider outline-none cursor-pointer rounded-full shadow-md truncate focus:ring-2 focus:ring-cobalt-pop max-w-[60vw] md:max-w-[220px] transition-all"
          >
            {CATEGORIES.map((cName) => (
              <option key={cName} value={cName} className="bg-popover text-popover-foreground">
                {cName === "Explore" ? "For You" : cName}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 flex items-center justify-center text-foreground/70">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 9 6 6 6-6"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Coins display - top left, doesn't overlap dropdown */}
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

      {reels.map((r, i) => {
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
      </div>
    </div>
  );
}
