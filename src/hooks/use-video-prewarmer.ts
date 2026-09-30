/**
 * useVideoPrewarmer
 * ─────────────────────────────────────────────────────────────────────────────
 * Pre-warms video URLs by injecting <link rel="preconnect"> elements for the
 * CDN hostnames of upcoming reels.
 *
 * Strategy (optimized for reduced buffering):
 *  - For the NEXT reel (distance 1): preconnect to CDN origin so TCP/TLS
 *    handshake is ready.
 *  - For reels at distance 2–3: preconnect only (no prefetch to avoid
 *    bandwidth contention with the currently playing video).
 *  - Thumbnails: preload for the next 3 reels only (was 5).
 *
 * Key insight: Aggressive prefetching of video files causes bandwidth
 * contention with the currently playing video, leading to MORE buffering.
 * We now rely on the browser's native preload="metadata" on the <video>
 * elements for buffering, and only help with connection warming.
 */

import { useEffect } from "react";
import type { Reel } from "@/lib/reels";

const injected = new Set<string>();

function injectHint(rel: string, href: string, as?: string) {
  const key = `${rel}::${href}`;
  if (injected.has(key)) return;
  injected.add(key);

  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (as) link.setAttribute("as", as);
  document.head.appendChild(link);
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

    // Cache thumbnails for the next 3 reels (reduced from 5 to save bandwidth)
    for (let i = 1; i <= 3; i++) {
      const r = reels[activeIdx + i];
      if (r?.thumbnail) preloadImage(r.thumbnail);
    }

    // Distance 1 — preconnect to CDN origin only (no video prefetch)
    // The <video preload="auto"> on the active+1 reel handles actual buffering
    const next1 = reels[activeIdx + 1];
    if (next1?.videoUrl) {
      try {
        const origin = new URL(next1.videoUrl).origin;
        injectHint("preconnect", origin);
      } catch {}
    }

    // Distance 2–3 — preconnect only to warm connections
    for (const offset of [2, 3]) {
      const reel = reels[activeIdx + offset];
      if (!reel?.videoUrl) continue;
      try {
        const origin = new URL(reel.videoUrl).origin;
        injectHint("preconnect", origin);
      } catch {}
    }
  }, [reels, activeIdx]);
}
