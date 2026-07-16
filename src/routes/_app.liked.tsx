import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getLiked, setLiked as saveLiked } from "@/lib/storage";
import type { Reel } from "@/lib/reels";
import { Heart, Trash2, Play } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/_app/liked")({
  component: LikedPage,
});

function LikedPage() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<Reel[]>([]);

  useEffect(() => {
    if (hydrated) setItems(getLiked());
  }, [hydrated]);

  const remove = (id: string) => {
    const next = items.filter((r) => r.id !== id);
    setItems(next);
    saveLiked(next);
  };

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-8">
        <p className="font-display text-marker text-xl lowercase italic">your little collection —</p>
        <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
          liked reels <span className="text-marker">({items.length})</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="paper-card flex flex-col items-center justify-center py-20 text-center">
          <Heart className="h-14 w-14 text-marker" strokeWidth={1.75} />
          <h2 className="mt-4 font-display text-2xl lowercase">nothing peeled yet</h2>
          <p className="mt-2 max-w-sm text-sm text-charcoal/70 dark:text-cream/70">
            tap the heart on any reel and it lands here — like a sticker on your notebook cover.
          </p>
          <Link to="/reels" className="btn-pill mt-6">
            discover reels
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {items.map((r, i) => (
            <div
              key={r.id}
              className="group relative aspect-[9/16] overflow-hidden rounded-xl border-[1.5px] border-charcoal bg-cocoa dark:border-cream"
              style={{ transform: `rotate(${(i % 3 - 1) * 0.6}deg)` }}
            >
              {r.thumbnail ? (
                <img src={r.thumbnail} alt={r.title ?? ""} className="h-full w-full object-cover" loading="lazy" />
              ) : (
                <video src={r.videoUrl} className="h-full w-full object-cover" muted playsInline preload="metadata" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              <Link
                to="/reels"
                search={{ start: r.id }}
                className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100"
                aria-label="Play"
              >
                <div className="flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-cream bg-cream/20 backdrop-blur">
                  <Play className="h-6 w-6 fill-cream text-cream" />
                </div>
              </Link>
              <button
                onClick={() => remove(r.id)}
                className="absolute right-2 top-2 flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-charcoal/70 text-cream backdrop-blur"
                aria-label="Remove"
              >
                <Trash2 className="h-4 w-4" />
              </button>
              {r.title && (
                <p className="absolute inset-x-2 bottom-2 line-clamp-2 text-xs font-medium text-cream">
                  {r.title}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
