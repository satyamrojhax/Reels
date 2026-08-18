import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useTheme, type Theme } from "@/hooks/use-theme";
import { getLiked, getSaved, KEYS, get, set, setLiked, setSaved, getCoins, hasUnlocked } from "@/lib/storage";
import { useHydrated } from "@/hooks/use-hydrated";
import { usePwa } from "@/hooks/use-pwa";
import { Eye, EyeOff, LogOut, Moon, Sun, Monitor, Trash2, Coins, Download, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { canInstall, install } = usePwa();
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const [showPin, setShowPin] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [likedCount, setLikedCount] = useState(0);
  const [savedCount, setSavedCount] = useState(0);
  const [watched, setWatched] = useState(0);
  const [coins, setCoins] = useState(0);

  useEffect(() => {
    if (!hydrated) return;
    setLikedCount(getLiked().length);
    setSavedCount(getSaved().length);
    setWatched(get<number>(KEYS.watched, 0));
    setCoins(getCoins());
  }, [hydrated]);

  const themes: { key: Theme; label: string; icon: typeof Sun }[] = [
    { key: "light", label: "light", icon: Sun },
    { key: "dark", label: "dark", icon: Moon },
    { key: "system", label: "system", icon: Monitor },
  ];

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <p className="font-display text-marker text-xl lowercase italic">your little corner —</p>
      <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
        settings.
      </h1>

      {/* Profile */}
      <section className="paper-card mt-8 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border-[1.5px] border-charcoal bg-dew font-display text-2xl text-cocoa dark:border-cream dark:bg-secondary dark:text-cream">
            {username?.[0]?.toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2 font-display text-2xl lowercase text-cocoa dark:text-cream">
              @{username}
              {hasUnlocked("badge_verified") && <BadgeCheck className="h-6 w-6 text-blue-500" />}
            </div>
            <div className="text-sm text-marker">a reels reader</div>
          </div>
        </div>
        <div className="mt-6 flex items-center justify-between rounded-lg border-[1.5px] border-charcoal/80 bg-dew px-4 py-3 dark:border-cream/50 dark:bg-secondary">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">pin</div>
            <div className="mt-0.5 font-mono text-base text-cocoa dark:text-cream">{showPin ? "000111" : "••••••"}</div>
          </div>
          <button
            onClick={() => setShowPin((s) => !s)}
            className="text-charcoal/70 hover:text-cocoa dark:text-cream/70 dark:hover:text-cream"
            aria-label="Toggle PIN visibility"
          >
            {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </section>

      {/* Stats */}
      <section className="mt-4 grid grid-cols-2 gap-3">
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{likedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            liked reels
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{savedCount}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            saved reels
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="font-display text-4xl text-cocoa dark:text-cream">{watched}</div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            reels watched
          </div>
        </div>
        <div className="paper-card p-5">
          <div className="flex items-center gap-2">
            <div className="font-display text-4xl text-cocoa dark:text-cream">{coins}</div>
            <Coins className="h-6 w-6 text-yellow-500" />
          </div>
          <div className="mt-1 text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
            coins earned
          </div>
        </div>
      </section>

      {/* Theme */}
      <section className="paper-card mt-4 p-6">
        <h2 className="text-[11px] font-medium uppercase tracking-[0.2em] text-charcoal/60 dark:text-cream/60">
          appearance
        </h2>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {themes.map((t) => {
            const Icon = t.icon;
            const active = theme === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTheme(t.key)}
                className={`flex flex-col items-center gap-2 rounded-lg border-[1.5px] px-3 py-4 text-sm lowercase transition ${
                  active
                    ? "border-charcoal bg-dew font-medium text-cocoa dark:border-cream dark:bg-secondary dark:text-cream"
                    : "border-charcoal/30 text-charcoal/70 hover:bg-dew dark:border-cream/30 dark:text-cream/70 dark:hover:bg-secondary"
                }`}
              >
                <Icon className="h-5 w-5" />
                {t.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* App */}
      {canInstall && (
        <section className="mt-4">
          <button
            onClick={() => install()}
            className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
          >
            <div>
              <div className="font-display text-lg lowercase text-cocoa dark:text-cream">install app</div>
              <div className="text-sm text-charcoal/70 dark:text-cream/70">add to home screen for a better experience.</div>
            </div>
            <Download className="h-5 w-5 text-cocoa dark:text-cream" />
          </button>
        </section>
      )}

      {/* About */}
      <section className="mt-4">
        <button
          onClick={() => navigate({ to: "/about" })}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">about us</div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">learn more about this app.</div>
          </div>
        </button>
      </section>

      {/* Danger */}
      <section className="mt-4 space-y-2">
        <button
          onClick={() => setShowResetConfirm(true)}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-cocoa dark:text-cream">reset all stats</div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">clear all liked, saved, coins and watched reels.</div>
          </div>
          <Trash2 className="h-5 w-5 text-charcoal/60 dark:text-cream/60" />
        </button>
        <button
          onClick={() => {
            logout();
            navigate({ to: "/login" });
          }}
          className="paper-card flex w-full items-center justify-between p-5 text-left transition hover:bg-dew dark:hover:bg-secondary"
        >
          <div>
            <div className="font-display text-lg lowercase text-marker">log out</div>
            <div className="text-sm text-charcoal/70 dark:text-cream/70">sign out of this device.</div>
          </div>
          <LogOut className="h-5 w-5 text-marker" />
        </button>
      </section>

      {/* Reset Confirmation Dialog */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="paper-card max-w-sm w-full p-6">
            <h2 className="font-display text-2xl lowercase text-cocoa dark:text-cream">reset all stats?</h2>
            <p className="mt-2 text-sm text-charcoal/70 dark:text-cream/70">
              this will clear all your liked reels, saved reels, coins and watch count. this action cannot be undone.
            </p>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 rounded-lg border-[1.5px] border-charcoal px-4 py-2.5 font-display text-sm lowercase text-cocoa transition hover:bg-dew dark:border-cream dark:text-cream dark:hover:bg-secondary"
              >
                cancel
              </button>
              <button
                onClick={() => {
                  setLiked([]);
                  setSaved([]);
                  set(KEYS.watched, 0);
                  set(KEYS.coins, 0);
                  setLikedCount(0);
                  setSavedCount(0);
                  setWatched(0);
                  setCoins(0);
                  setShowResetConfirm(false);
                }}
                className="flex-1 rounded-lg border-[1.5px] border-marker bg-marker px-4 py-2.5 font-display text-sm lowercase text-white transition hover:bg-marker/90"
              >
                reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
