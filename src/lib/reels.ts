import { getRandomMode, getRecommendedOffset, setRecommendedOffset } from "./storage";

export type Reel = {
  id: string;
  source: "v1" | "v2" | "v4" | "local" | "insta_reels";
  videoUrl: string;
  thumbnail?: string;
  title?: string;
  description?: string;
  duration?: string;
  views?: number;
  likes?: number;
  timeAgo?: string;
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
  { key: "v1" as const, url: "https://xvideos-backend-reels.vercel.app/v1/xvideos", maxPage: 67 },
  { key: "v2" as const, url: "https://xvideos-backend-reels.vercel.app/v2/xvideos", maxPage: 67 },
  { key: "v4" as const, url: "https://xvideos-backend-reels.vercel.app/v4/xvideos", maxPage: 62 },
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
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i), (h |= 0);
  return Math.abs(h).toString(36);
}

let localDb: Reel[] = [];
let recommendedDb: Reel[] = [];
let isDbLoaded = false;

async function loadDatabases() {
  if (isDbLoaded) return;
  try {
    const [localRes, recRes] = await Promise.all([
      fetch("/assets/v1-reels-db.json"),
      fetch("/assets/recommended_data.json"),
    ]);

    if (localRes.ok) {
      const localDbRaw = await localRes.json();
      localDb = shuffle((localDbRaw as any[]).map((v, i) => ({
        id: `local-${i}-${hashCode(v.url)}`,
        source: "local" as const,
        videoUrl: v.url,
        views: v.views,
        likes: v.likes,
        title: "Watch Reels 18+",
      })));
    }

    if (recRes.ok) {
      const recommendedDbRaw = await recRes.json();
      recommendedDb = (recommendedDbRaw as any[]).map((v: any) => ({
        id: `recommended-${v.id}`,
        source: "insta_reels" as const,
        videoUrl: v.video_url,
        thumbnail: v.image,
        title: v.title,
      }));
    }

    isDbLoaded = true;
  } catch (error) {
    console.error("Failed to load databases:", error);
  }
}

async function fetchWithRetry(url: string, attempts = 2): Promise<Response | null> {
  let delay = 400;
  for (let i = 0; i < attempts; i++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
        "Accept": "*/*",
      };
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;
    } catch { }
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
      delay *= 2;
    }
  }
  return null;
}

async function fetchXvideos(base: (typeof XVIDEO_BASES)[number], page: number): Promise<Reel[]> {
  const safePage = ((page - 1) % base.maxPage) + 1;
  const res = await fetchWithRetry(`${base.url}?page=${safePage}`);
  if (!res) return [];
  try {
    const json = (await res.json()) as { videos?: XvideoItem[] };
    return (json.videos ?? []).map((v) => ({
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
  } catch {
    return [];
  }
}

let localDbOffset = 0;

export type FeedFilter = "all" | "local" | "trending" | "recommended";

export async function fetchReelsPage(page: number, filter: FeedFilter = "all"): Promise<{ items: Reel[]; nextPage: number }> {
  await loadDatabases();

  let selectedReels: Reel[] = [];
  const isRandom = getRandomMode();

  switch (filter) {
    case "recommended": {
      if (isRandom) {
        selectedReels.push(...shuffle(recommendedDb).slice(0, 15));
      } else {
        let offset = getRecommendedOffset();
        let slice = recommendedDb.slice(offset, offset + 15);
        if (slice.length < 15) {
          slice = [...slice, ...recommendedDb.slice(0, 15 - slice.length)];
        }
        setRecommendedOffset((offset + 15) % recommendedDb.length);
        selectedReels.push(...slice);
      }
      break;
    }

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

    case "all":
    default: {
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

  return { items: deduped, nextPage: page + 1 };
}
