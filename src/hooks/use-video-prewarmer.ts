/**
 * useVideoPrewarmer
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-warms video URLs by injecting <link rel="preconnect"> elements for the
 * CDN hostnames of upcoming reels.
 *
 * Strategy:
 *  - For the NEXT reel (distance 1): inject a <link rel="preload" as="video">
 *    to start buffering the actual bytes immediately.
 *  - For reels at distance 2–3: inject <link rel="preconnect"> for the CDN
 *    host to open the TCP/TLS connection early.
 *
 * This is complementary to the `preload="auto"` on the <video> element — the
 * link hints fire even before React has rendered the video element.
 */

import { useEffect } from "react";
import type { Reel } from "@/lib/reels";

const injected = new Set<string>();

function injectHint(rel: string, href: string, as?: string, crossorigin?: boolean) {
  const key = `${rel}::${href}`;
  if (injected.has(key)) return;
  injected.add(key);

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (as) link.setAttribute("as", as);
  if (crossorigin) link.setAttribute("crossorigin", "anonymous");
  document.head.appendChild(link);
}

function getHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

function preloadImage(url: string) {
  const key = `img::${url}`;
  if (injected.has(key)) return;
  injected.add(key);
  const img = new Image();
  img.src = url;
}

export function useVideoPrewarmer(reels: Reel[], activeIdx: number) {
  useEffect(() => {
    if (reels.length === 0) return;

    // Cache thumbnails for the next 5 reels
    for (let i = 1; i <= 5; i++) {
      const r = reels[activeIdx + i];
      if (r?.thumbnail) preloadImage(r.thumbnail);
    }

    // Distance 1 — preconnect + preload the actual video file aggressively
    const next1 = reels[activeIdx + 1];
    if (next1?.videoUrl) {
      const host = getHostname(next1.videoUrl);
      if (host) injectHint("preconnect", `${new URL(next1.videoUrl).origin}`, undefined, true);
      
      // Inject fetch prefetch to aggressively download video bytes into HTTP cache
      injectHint("prefetch", next1.videoUrl, "video");
    }

    // Distance 2–3 — preconnect and prefetch
    for (const offset of [2, 3]) {
      const reel = reels[activeIdx + offset];
      if (!reel?.videoUrl) continue;
      try {
        const origin = new URL(reel.videoUrl).origin;
        injectHint("preconnect", origin, undefined, true);
        injectHint("prefetch", reel.videoUrl, "video");
      } catch {}
    }
  }, [reels, activeIdx]);
}
