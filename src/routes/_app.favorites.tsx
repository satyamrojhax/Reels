import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getFavorites, toggleFavorite, type FavoriteCreator } from "@/lib/storage";
import { Users, UserMinus, Play } from "lucide-react";
import { useHydrated } from "@/hooks/use-hydrated";

export const Route = createFileRoute("/_app/favorites")({
  component: FavoritesPage,
});

function FavoritesPage() {
  const hydrated = useHydrated();
  const [items, setItems] = useState<FavoriteCreator[]>([]);

  useEffect(() => {
    if (hydrated) setItems(getFavorites());
  }, [hydrated]);

  const remove = (username: string) => {
    toggleFavorite(username);
    setItems(getFavorites());
  };

  if (!hydrated) return null;

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10">
      <div className="mb-8">
        <p className="font-display text-marker text-xl lowercase italic">
          your favorites —
        </p>
        <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
          creators <span className="text-marker">({items.length})</span>
        </h1>
      </div>

      {items.length === 0 ? (
        <div className="paper-card flex flex-col items-center justify-center py-20 text-center">
          <Users className="h-14 w-14 text-marker" strokeWidth={1.75} />
          <h2 className="mt-4 font-display text-2xl lowercase">no favorites yet</h2>
          <p className="mt-2 max-w-sm text-sm text-charcoal/70 dark:text-cream/70">
            tap follow on a creator's profile or video and they will appear here.
          </p>
          <Link to="/reels" className="btn-pill mt-6">
            discover reels
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:grid-cols-3">
          {items.map((fav) => (
            <div
              key={fav.username}
              className="group flex items-center justify-between p-4 rounded-xl border-[1.5px] border-charcoal bg-cocoa dark:border-cream dark:bg-dusk-indigo"
            >
              <Link 
                to={`/creator/${encodeURIComponent(fav.username)}` as any}
                className="flex items-center gap-4 flex-1 overflow-hidden cursor-pointer"
              >
                <div className="ig-gradient-bg flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white">
                  {fav.username[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base font-bold text-cream truncate">{fav.username}</p>
                  <p className="text-[10px] text-cream/60 mt-0.5">since {new Date(fav.timestamp).toLocaleDateString()}</p>
                </div>
              </Link>
              <button
                onClick={() => remove(fav.username)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-cream bg-charcoal/30 text-cream hover:bg-destructive/80 transition-colors shrink-0 ml-2"
                aria-label="Unfollow"
                title="Unfollow"
              >
                <UserMinus className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
