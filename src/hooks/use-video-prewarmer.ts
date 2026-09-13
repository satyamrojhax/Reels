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

export function useVideoPrewarmer(reels: Reel[], activeIdx: number) {
  useEffect(() => {
    if (reels.length === 0) return;

    // Distance 1 — preconnect + preload the actual video file
    const next1 = reels[activeIdx + 1];
    if (next1?.videoUrl) {
      const host = getHostname(next1.videoUrl);
      if (host) injectHint("preconnect", `${new URL(next1.videoUrl).origin}`, undefined, true);
    }

    // Distance 2–3 — at minimum open TCP connections to CDN hosts
    for (const offset of [2, 3]) {
      const reel = reels[activeIdx + offset];
      if (!reel?.videoUrl) continue;
      try {
        const origin = new URL(reel.videoUrl).origin;
        injectHint("preconnect", origin, undefined, true);
      } catch {}
    }
  }, [reels, activeIdx]);
}
