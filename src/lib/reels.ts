export type Reel = {
  id: string;
  source: "v1" | "v2" | "v3" | "v4" | "xreels";
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

type XreelsItem = {
  url: string;
  views?: number;
  likes?: number;
};

const XVIDEO_BASES = [
  { key: "v1" as const, url: "https://xvideos-backend-reels.vercel.app/v1/xvideos" },
  { key: "v2" as const, url: "https://xvideos-backend-reels.vercel.app/v2/xvideos" },
  { key: "v3" as const, url: "https://xvideos-backend-reels.vercel.app/v3/xvideos" },
  { key: "v4" as const, url: "https://xvideos-backend-reels.vercel.app/v4/xvideos" },
];

const XREELS_URL = "https://piewallah-proxy.satyamrojhax.workers.dev/?quest=https://xreels.co/videos.json";

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

async function fetchWithRetry(url: string, attempts = 3): Promise<Response | null> {
  let delay = 400;
  for (let i = 0; i < attempts; i++) {
    try {
      const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/150.0.0.0 Mobile Safari/537.36",
        "Accept": "*/*",
        "Accept-Encoding": "gzip, deflate, br, zstd",
        "Accept-Language": "en-GB,en-US;q=0.9,en;q=0.8",
        "Referer": "https://xreels.co/",
      };
      
      const res = await fetch(url, { headers });
      if (res.ok) return res;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) return null;
    } catch {}
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, delay + Math.random() * 200));
      delay *= 2;
    }
  }
  return null;
}

async function fetchXvideos(base: (typeof XVIDEO_BASES)[number], page: number): Promise<Reel[]> {
  const res = await fetchWithRetry(`${base.url}?page=${page}`);
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

let xreelsCache: Reel[] | null = null;
async function fetchXreels(): Promise<Reel[]> {
  if (xreelsCache) return xreelsCache;
  const res = await fetchWithRetry(XREELS_URL);
  if (!res) return [];
  try {
    const arr = (await res.json()) as XreelsItem[];
    xreelsCache = arr.map((v, i) => ({
      id: `xreels-${i}-${hashCode(v.url)}`,
      source: "xreels" as const,
      videoUrl: v.url,
      views: v.views,
      likes: v.likes,
      title: "Xreels Short",
    }));
    return xreelsCache;
  } catch {
    return [];
  }
}

function hashCode(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i), (h |= 0);
  return Math.abs(h).toString(36);
}

export async function fetchReelsPage(page: number): Promise<{ items: Reel[]; nextPage: number }> {
  // Fetch from all sources in parallel
  const xvideoTasks = XVIDEO_BASES.map((b) => fetchXvideos(b, page));
  const xreelsTask = page === 1 ? fetchXreels() : Promise.resolve([]);
  
  const [xvideoResults, xreelsResults] = await Promise.all([
    Promise.all(xvideoTasks),
    xreelsTask,
  ]);
  
  const xvideoMerged = xvideoResults.flat();
  
  // Mix ratios: 30% xreels, 20% v1, 20% v2, 20% v3, 10% v4
  // Calculate how many to take from each source
  const totalTarget = 50; // Target total reels per page
  const xreelsCount = Math.floor(totalTarget * 0.3);
  const v1Count = Math.floor(totalTarget * 0.2);
  const v2Count = Math.floor(totalTarget * 0.2);
  const v3Count = Math.floor(totalTarget * 0.2);
  const v4Count = Math.floor(totalTarget * 0.1);
  
  // Take reels from each source according to ratios
  const selectedReels: Reel[] = [];
  
  // Add xreels reels (primary source)
  if (xreelsResults.length > 0) {
    selectedReels.push(...shuffle(xreelsResults).slice(0, xreelsCount));
  }
  
  // Add xvideos reels by source
  const v1Reels = xvideoResults[0] || [];
  const v2Reels = xvideoResults[1] || [];
  const v3Reels = xvideoResults[2] || [];
  const v4Reels = xvideoResults[3] || [];
  
  selectedReels.push(...shuffle(v1Reels).slice(0, v1Count));
  selectedReels.push(...shuffle(v2Reels).slice(0, v2Count));
  selectedReels.push(...shuffle(v3Reels).slice(0, v3Count));
  selectedReels.push(...shuffle(v4Reels).slice(0, v4Count));
  
  // Deduplicate by video URL
  const seen = new Set<string>();
  const deduped = selectedReels.filter((r) => {
    if (seen.has(r.videoUrl)) return false;
    seen.add(r.videoUrl);
    return true;
  });
  
  // If we don't have enough, fill with remaining from any source
  if (deduped.length < 10) {
    const allReels = [...xreelsResults, ...xvideoMerged];
    const remaining = shuffle(allReels).filter((r) => !seen.has(r.videoUrl));
    deduped.push(...remaining.slice(0, 20 - deduped.length));
  }
  
  if (deduped.length === 0) {
    throw new Error("Couldn't load reels. Please check your connection and try again.");
  }
  
  return { items: shuffle(deduped), nextPage: page + 1 };
}
