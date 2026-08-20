import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Film, Heart, Bookmark, Settings, ShoppingBag, BadgeCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { hasUnlocked } from "@/lib/storage";

const items: { to: any; label: string; icon: LucideIcon }[] = [
  { to: "/home", label: "home", icon: Home },
  { to: "/reels", label: "reels", icon: Film },
  { to: "/liked", label: "liked", icon: Heart },
  { to: "/saved", label: "saved", icon: Bookmark },
  { to: "/shop", label: "shop", icon: ShoppingBag },
  { to: "/settings", label: "settings", icon: Settings },
];

function BrandMark({ size = 36 }: { size?: number }) {
  return (
    <span
      className="font-script leading-none text-twilight-navy dark:text-cream-linen"
      style={{ fontSize: size, transform: "translateY(2px)" }}
    >
      reels
    </span>
  );
}

export function Sidebar({ username }: { username: string | null }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isVerified = hasUnlocked("badge_verified");
  const isVip = hasUnlocked("badge_vip");
  return (
    <aside className="fixed left-0 top-0 z-30 hidden h-screen w-[244px] flex-col border-r border-twilight-navy bg-cloud-white px-6 py-8 md:flex dark:bg-dusk-indigo dark:border-periwinkle-sky/40">
      <Link to="/home" className="mb-10 block">
        <BrandMark size={40} />
      </Link>
      <nav className="flex-1 space-y-1">
        {items.map((it) => {
          const active = pathname === it.to;
          const Icon = it.icon;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`group flex items-center gap-3 rounded-md px-3 py-2.5 text-[15px] transition ${
                active
                  ? "bg-periwinkle-sky text-twilight-navy dark:bg-secondary dark:text-cream-linen"
                  : "text-twilight-navy hover:bg-periwinkle-sky/30 dark:text-cream-linen/80 dark:hover:bg-secondary/60"
              }`}
            >
              <Icon className="h-[18px] w-[18px]" strokeWidth={active ? 2.25 : 1.75} />
              <span className={active ? "font-medium" : ""}>{it.label}</span>
              {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-cobalt-pop" />}
            </Link>
          );
        })}
      </nav>
      {username && (
        <div className="mt-6 flex items-center gap-3 rounded-md border border-slate-mist bg-cream-linen px-3 py-2.5 dark:border-periwinkle-sky/40 dark:bg-secondary">
          <div className="flex h-9 w-9 items-center justify-center rounded-full border border-twilight-navy bg-cloud-white text-sm font-semibold text-twilight-navy dark:border-cream-linen dark:bg-transparent dark:text-cream-linen">
            {username[0]?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 truncate text-sm font-medium text-twilight-navy dark:text-cream-linen">
              <span className={isVip ? "vip-text" : ""}>@{username}</span>
              {isVip && <span title="VIP">👑</span>}
              {isVerified && <BadgeCheck className="h-4 w-4 text-blue-500 flex-shrink-0" />}
            </div>
            <div className="text-[10px] font-medium uppercase tracking-[0.18em] text-slate-mist">signed in</div>
          </div>
        </div>
      )}
    </aside>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed bottom-4 left-1/2 z-40 flex h-14 -translate-x-1/2 items-center gap-1 rounded-full border border-twilight-navy bg-cloud-white px-2 md:hidden dark:border-periwinkle-sky dark:bg-dusk-indigo">
      {items.map((it) => {
        const active = pathname === it.to;
        const Icon = it.icon;
        return (
          <Link
            key={it.to}
            to={it.to}
            replace={true}
            className={`flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-twilight-navy transition dark:text-cream-linen ${
              active ? "bg-periwinkle-sky dark:bg-secondary" : ""
            }`}
          >
            <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
            {active && <span className="ml-2 text-xs lowercase">{it.label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}

export function MarqueeStrip() {
  const msg = "free shipping on daydreams · pastel sunsets · press hold for 2× · double-tap to like · ";
  const repeated = msg.repeat(6);
  return (
    <div className="marquee-strip">
      <div className="animate-[marquee_45s_linear_infinite] inline-block">
        {repeated}
      </div>
      <style>{`@keyframes marquee { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

export function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 bg-background py-3 px-4 text-center text-xs text-muted-foreground md:pl-[244px]">
    </footer>
  );
}

export { BrandMark };
