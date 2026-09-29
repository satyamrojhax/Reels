import { getRandomMode } from "./storage";
import { videoCache } from "./video-cache";

export type Reel = {
  id: string;
  source: "v1" | "v2" | "v4" | "local" | "insta_" | "satyamrojha";
  videoUrl: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: string;
  views?: number;
  likes?: number;
  dislikes?: number;
  timeAgo?: string;
  username?: string;
};

type XvideoItem = {
  id: string;
  name: string;
  description?: string;
  thumbnail?: string;
  videoUrl: string;
  duration?: string;
  views?: number;
  timeAgo?: string;
  uploadDate?: string;
};

const XVIDEO_BASES = [
  { key: "v1" as const, url: "https://xvideos.lfrdcatechnologies.cc.cd/v1/xvideos", maxPage: 67 },
  { key: "v2" as const, url: "https://xvideos.lfrdcatechnologies.cc.cd/v2/xvideos", maxPage: 67 },
  { key: "v4" as const, url: "https://xvideos.lfrdcatechnologies.cc.cd/v4/xvideos", maxPage: 62 },
];

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) ((h = (h << 5) - h + s.charCodeAt(i)), (h |= 0));
  return Math.abs(h).toString(36);
}

// ─── Local DB loading (eagerly initiated at module import) ────────────────────

let localDb: Reel[] = [];
/** Single shared promise — multiple callers await the same load. */
let dbLoadPromise: Promise<void> | null = null;

function startDatabaseLoad(): Promise<void> {
  if (dbLoadPromise) return dbLoadPromise;
  dbLoadPromise = (async () => {
    try {
      const localRes = await fetch("/assets/v1-reels-db.json");

      if (localRes.ok) {
        const localDbRaw = await localRes.json();
        localDb = shuffle(
          (localDbRaw as any[]).map((v, i) => ({
            id: `local-${i}-${hashCode(v.url)}`,
            source: "local" as const,
            videoUrl: v.url,
            views: v.views,
            likes: v.likes,
            title: "Watch Reels 18+",
          })),
        );
      }
    } catch (error) {
      console.error("Failed to load databases:", error);
    }
  })();
  return dbLoadPromise;
}

// Kick off the DB load immediately at import time — no waiting for first request
if (typeof window !== "undefined") {
  startDatabaseLoad();
}

async function ensureDatabasesLoaded(): Promise<void> {
  await startDatabaseLoad();
}

// ─── Network Fetch ────────────────────────────────────────────────────────────

async function fetchWithRetry(url: string, attempts = 2): Promise<Response | null> {
  const headers: Record<string, string> = {
    "User-Agent":
      "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
    Accept: "*/*",
  };

  // Race two parallel attempts — whichever resolves first wins.
  // This cuts p95 latency significantly compared to sequential retries.
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;
    } catch { }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 200));
    }
  }
  return null;
}

/** Fetch xvideos page, using videoCache as the backing store. */
async function fetchXvideos(base: (typeof XVIDEO_BASES)[number], page: number): Promise<Reel[]> {
  const safePage = ((page - 1) % base.maxPage) + 1;
  const cacheKey = `xv::${base.key}::p${safePage}`;

  // L1/L2 cache hit — instant return
  const cached = await videoCache.get<Reel[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`${base.url}?page=${safePage}`);
  if (!res) return [];
  try {
    const json = (await res.json()) as { videos?: XvideoItem[] };
    const reels: Reel[] = (json.videos ?? []).map((v) => ({
      id: `${base.key}-${v.id}`,
      source: base.key,
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.name,
      description: v.description,
      duration: v.duration,
      views: v.views,
      timeAgo: v.timeAgo,
    }));

    // Cache for 60 min — fire-and-forget
    videoCache.set(cacheKey, reels).catch(() => { });
    return reels;
  } catch {
    return [];
  }
}

async function fetchLatestReels(page: number): Promise<Reel[]> {
  const apiPage = page - 1;
  const cacheKey = `satyamrojha::latest::p${apiPage}`;

  const cached = await videoCache.get<Reel[]>(cacheKey);
  if (cached) return cached;

  const res = await fetchWithRetry(`https://reelsbackend.satyamrojha.cc.cd/api/latest-reels?page=${apiPage}`);
  if (!res) return [];
  try {
    const rawJson = await res.json();
    const arr = Array.isArray(rawJson) ? rawJson : (rawJson.data || []);
    const reels: Reel[] = arr.map((v: any) => ({
      id: `latest-${v.id}`,
      source: "satyamrojha",
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.title,
      description: v.description,
      views: v.views,
      likes: v.likes,
      dislikes: v.dislikes,
      username: v.username,
    }));
    videoCache.set(cacheKey, reels).catch(() => {});
    return reels;
  } catch {
    return [];
  }
}

async function fetchCategoryReels(category: string): Promise<Reel[]> {
  const res = await fetchWithRetry(`https://reelsbackend.satyamrojha.cc.cd/api/categories/${encodeURIComponent(category)}`);
  if (!res) return [];
  try {
    const rawJson = await res.json();
    const arr = Array.isArray(rawJson) ? rawJson : (rawJson.data || []);
    const reels: Reel[] = arr.map((v: any) => ({
      id: `category-${v.id}-${Math.random().toString(36).slice(2)}`,
      source: "satyamrojha",
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.title,
      description: v.description,
      views: v.views,
      likes: v.likes,
      dislikes: v.dislikes,
      username: v.username,
    }));
    return reels;
  } catch {
    return [];
  }
}

export const CATEGORIES = [
  "Explore",
  "18+",
  "Desi",
  "Homemade",
  "Couple",
  "College(18+)",
  "Gay",
  "Lesbian",
  "Shemale",
  "Asian",
  "JAV",
  "Japanese(JAV)",
  "American",
  "Latina",
  "Ebony",
  "Interracial",
  "Amateur",
  "Al",
  "MILF",
  "Anal",
  "Mature",
  "Big-Ass",
  "Big-Tits",
  "Curvy",
  "Petite",
  "Girlfriend",
  "Wife",
  "Threesome",
  "Group",
  "Swingers",
  "Cuckold",
  "Blowjob",
  "Oral",
  "Deepthroat",
  "Creampie",
  "Facial",
  "Cowgirl",
  "Reverse-Cowgirl",
  "Cam",
  "Self-Shot",
  "Mobile-Recorded",
  "Hidden-Cam",
  "Spy-Cam",
  "Webcam",
  "Live-Cam",
  "Flash",
  "Hentai",
  "Cosplay",
  "Roleplay",
  "Uniforms",
  "Massage",
  "Office",
  "Hotel",
  "Public",
  "Outdoor",
  "Car",
  "Gym",
  "Shower",
  "BDSM",
  "Bondage",
  "Domination",
  "Submission",
  "Foot-Fetish",
  "Stockings",
  "Latex",
  "Leather",
  "Pantyhose",
  "Fashion",
  "3D",
  "Women",
  "Men",
  "Solo-Female",
  "Solo-Male",
  "Masturbation",
  "Toys",
  "LGBT",
  "Bisexual",
  "Trans",
  "Transgender",
  "Female-Domination",
  "Romantic",
  "Passionate",
  "Slow",
  "Rough",
  "Vintage",
  "Retro",
  "Classic",
  "Hardcore",
  "Softcore",
  "Bhabhi",
  "Aunty",
  "Indian-Wife",
  "Hindi",
  "Telugu",
  "Tamil",
  "Malayalam",
  "Punjabi",
  "Bengali",
  "Desi-Village",
  "Indian-Webcam"
];

let localDbOffset = 0;

export type FeedFilter = "all" | "local" | "trending" | "latest" | `category:${string}`;

export async function fetchReelsPage(
  page: number,
  filter: FeedFilter = "all",
): Promise<{ items: Reel[]; nextPage: number }> {
  // Full feed-page cache — covers entire assembled page including local DB slices
  const feedCacheKey = `feed::${filter}::p${page}`;

  // Only use feed cache in non-random mode (random always produces different results)
  const isRandom = getRandomMode();
  if (!isRandom) {
    const cached = await videoCache.get<{ items: Reel[]; nextPage: number }>(feedCacheKey);
    if (cached) return cached;
  }

  await ensureDatabasesLoaded();

  let selectedReels: Reel[] = [];

  switch (filter) {
    case "local": {
      if (isRandom) {
        selectedReels.push(...shuffle(localDb).slice(0, 30));
      } else {
        let slice = localDb.slice(localDbOffset, localDbOffset + 30);
        if (slice.length < 30) {
          slice = [...slice, ...localDb.slice(0, 30 - slice.length)];
        }
        localDbOffset = (localDbOffset + 30) % localDb.length;
        selectedReels.push(...slice);
      }
      break;
    }

    case "trending": {
      if (isRandom) {
        const randomBaseIndex = Math.floor(Math.random() * XVIDEO_BASES.length);
        const base = XVIDEO_BASES[randomBaseIndex];
        const randomPage = Math.floor(Math.random() * base.maxPage) + 1;
        const res = await fetchXvideos(base, randomPage);
        selectedReels.push(...res);
      } else {
        const offset = page - 1;
        const sourceIndex = offset % 3;
        const apiPage = Math.floor(offset / 3) + 1;
        const base = XVIDEO_BASES[sourceIndex];
        const safePage = ((apiPage - 1) % base.maxPage) + 1;
        const res = await fetchXvideos(base, safePage);
        selectedReels.push(...res);
      }
      break;
    }

    case "latest": {
      const res = await fetchLatestReels(page);
      selectedReels.push(...res);
      break;
    }

    case "all":
    default: {
      if (filter.startsWith("category:")) {
        const categoryName = filter.split(":")[1] || "Explore";
        const res = await fetchCategoryReels(categoryName);
        selectedReels.push(...res);
        break;
      }

      if (filter === "all") {
        if (isRandom) {
          selectedReels.push(...shuffle(localDb).slice(0, 50));
          const base = XVIDEO_BASES[Math.floor(Math.random() * XVIDEO_BASES.length)];
          const randomPage = Math.floor(Math.random() * base.maxPage) + 1;
          const res = await fetchXvideos(base, randomPage);
          selectedReels.push(...res);
        } else {
          let slice = localDb.slice(localDbOffset, localDbOffset + 50);
          if (slice.length < 50) {
            slice = [...slice, ...localDb.slice(0, 50 - slice.length)];
          }
          localDbOffset = (localDbOffset + 50) % localDb.length;
          selectedReels.push(...slice);

          const offset = page - 1;
          const sourceIndex = offset % 3;
          const apiPage = Math.floor(offset / 3) + 1;
          const base = XVIDEO_BASES[sourceIndex];
          const safePage = ((apiPage - 1) % base.maxPage) + 1;
          const res = await fetchXvideos(base, safePage);
          selectedReels.push(...res);
        }
      }
      break;
    }
  }

  if (isRandom) {
    selectedReels = shuffle(selectedReels);
  }

  const seen = new Set<string>();
  const deduped = selectedReels.filter((r) => {
    if (seen.has(r.videoUrl)) return false;
    seen.add(r.videoUrl);
    return true;
  });

  if (deduped.length === 0) {
    throw new Error("Couldn't load reels. Please check your connection and try again.");
  }

  const result = { items: deduped, nextPage: page + 1 };

  // Cache the assembled page
  if (!isRandom) {
    videoCache.set(feedCacheKey, result).catch(() => { });
  }

  return result;
}

/**
 * Background-prefetch a page into the cache without returning it.
 * Call this to warm the next page before the user scrolls to it.
 */
export function prefetchReelsPage(page: number, filter: FeedFilter = "all"): void {
  fetchReelsPage(page, filter).catch(() => { });
}

export function warmAllFilters(): void {
  // Only prefetch the local feed to avoid unnecessary API calls
  prefetchReelsPage(1, "local");
}

export async function fetchCreatorReelsPage(
  username: string,
  type: "latest" | "popular",
  page: number
): Promise<{ items: Reel[]; nextPage: number | undefined }> {
  const res = await fetchWithRetry(`https://reelsbackend.satyamrojha.cc.cd/api/creator?creator=${encodeURIComponent(username)}&type=${type}&page=${page}`);
  
  if (!res) {
    throw new Error("Failed to load creator reels");
  }

  try {
    const rawJson = await res.json();
    const arr = Array.isArray(rawJson) ? rawJson : (rawJson.data || []);
    const reels: Reel[] = arr.map((v: any) => ({
      id: `creator-${v.id}-${Math.random().toString(36).slice(2)}`,
      source: "satyamrojha",
      videoUrl: v.videoUrl,
      thumbnail: v.thumbnail,
      title: v.title,
      description: v.description,
      views: v.views,
      likes: v.likes,
      dislikes: v.dislikes,
      username: v.username,
    }));

    return {
      items: reels,
      nextPage: rawJson.hasNextPage ? (rawJson.nextPage ?? page + 1) : undefined,
    };
  } catch {
    throw new Error("Error parsing creator reels");
  }
}
