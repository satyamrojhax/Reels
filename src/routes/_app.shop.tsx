import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getCoins, spendCoins, getUnlocks, unlockItem, hasUnlocked, set } from "@/lib/storage";
import { ShoppingBag, CheckCircle, Zap, Palette, Lock, Sparkles, Tv, Music, Terminal, PartyPopper } from "lucide-react";

export const Route = createFileRoute("/_app/shop")({
  component: ShopPage,
});

type ShopItem = {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string; strokeWidth?: number }>;
  cost: number;
  onApply?: () => void;
};

const ITEMS: ShopItem[] = [
  {
    id: "badge_verified",
    name: "Verified Badge",
    description: "Get a glowing blue checkmark next to your name.",
    icon: CheckCircle,
    cost: 99,
  },
  {
    id: "theme_neon",
    name: "Neon Cyberpunk Theme",
    description: "Unlock a dark futuristic aesthetic with pink and cyan glows.",
    icon: Palette,
    cost: 499,
    onApply: () => {
      set("ig.theme", "neon");
      window.dispatchEvent(new Event("theme-change"));
    },
  },
  {
    id: "theme_matrix",
    name: "Matrix Hacker Theme",
    description: "Enter the mainframe. Green text on black background.",
    icon: Terminal,
    cost: 999,
    onApply: () => {
      set("ig.theme", "matrix");
      window.dispatchEvent(new Event("theme-change"));
    },
  },
  {
    id: "badge_vip",
    name: "VIP Golden Username",
    description: "Your username turns shiny gold with a crown across the app.",
    icon: Sparkles,
    cost: 2000,
  },
  {
    id: "effect_confetti",
    name: "Confetti Likes",
    description: "Double tap to explode confetti instead of a boring heart.",
    icon: PartyPopper,
    cost: 300,
  },
  {
    id: "filter_crt",
    name: "CRT Retro Filter",
    description: "Adds scanlines and screen curvature to the video player.",
    icon: Tv,
    cost: 500,
    onApply: () => {
      const current = localStorage.getItem("ig.crt") === "true";
      set("ig.crt", !current);
      window.dispatchEvent(new Event("effects-change"));
    },
  },
  {
    id: "sound_meme",
    name: "Meme Soundboard",
    description: "Plays goofy sounds occasionally.",
    icon: Music,
    cost: 750,
    onApply: () => {
      const current = localStorage.getItem("ig.meme_sounds") === "true";
      set("ig.meme_sounds", !current);
      window.dispatchEvent(new Event("effects-change"));
    },
  },
];

function ShopPage() {
  const [coins, setCoins] = useState(0);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [activeTheme, setActiveTheme] = useState("");
  const [activeCrt, setActiveCrt] = useState(false);
  const [activeMeme, setActiveMeme] = useState(false);

  const formatCoins = (num: number) => new Intl.NumberFormat("en-IN").format(num);

  useEffect(() => {
    setCoins(getCoins());
    setUnlocks(getUnlocks());
    const raw = localStorage.getItem("ig.theme");
    setActiveTheme(raw ? JSON.parse(raw) : "system");
    setActiveCrt(localStorage.getItem("ig.crt") === "true");
    setActiveMeme(localStorage.getItem("ig.meme_sounds") === "true");

    const handleCoinsChange = () => setCoins(getCoins());
    const handleThemeChange = () => {
      const current = localStorage.getItem("ig.theme");
      setActiveTheme(current ? JSON.parse(current) : "system");
    };
    const handleEffectsChange = () => {
      setActiveCrt(localStorage.getItem("ig.crt") === "true");
      setActiveMeme(localStorage.getItem("ig.meme_sounds") === "true");
    };

    window.addEventListener("coins-change", handleCoinsChange);
    window.addEventListener("theme-change", handleThemeChange);
    window.addEventListener("effects-change", handleEffectsChange);
    return () => {
      window.removeEventListener("coins-change", handleCoinsChange);
      window.removeEventListener("theme-change", handleThemeChange);
      window.removeEventListener("effects-change", handleEffectsChange);
    };
  }, []);

  const handlePurchase = (item: ShopItem) => {
    if (unlocks.includes(item.id)) {
      if (item.onApply) item.onApply();
      return;
    }

    if (spendCoins(item.cost)) {
      unlockItem(item.id);
      setCoins(getCoins());
      setUnlocks(getUnlocks());
      if (item.onApply) item.onApply();
    } else {
      alert("Not enough coins! Watch more reels to earn coins.");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-10 pb-24 md:pl-[268px]">
      <div className="mb-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-display text-marker text-xl lowercase italic">treat yourself —</p>
          <h1 className="mt-2 font-display text-[48px] leading-[1.05] lowercase text-cocoa md:text-[64px] dark:text-cream">
            coin shop
          </h1>
        </div>
        <div className="flex w-full sm:w-auto items-center justify-between sm:justify-start gap-3 rounded-full border-[1.5px] border-charcoal bg-cream px-5 py-2 dark:border-cream dark:bg-charcoal">
          <span className="font-display text-lg lowercase text-charcoal/70 dark:text-cream/70">balance:</span>
          <span className="font-display text-2xl text-marker">{formatCoins(coins)} 🪙</span>
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => {
          const isUnlocked = unlocks.includes(item.id);
          const canAfford = coins >= item.cost;

          return (
            <div
              key={item.id}
              className={`paper-card flex flex-col relative overflow-hidden p-6 transition-transform ${isUnlocked
                ? "border-marker bg-marker/5"
                : canAfford
                  ? "hover:-translate-y-1 hover:shadow-[4px_4px_0px_rgba(255,107,107,0.3)]"
                  : "opacity-80"
                }`}
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border-[1.5px] border-charcoal bg-cream text-cocoa dark:border-cream dark:bg-charcoal dark:text-cream">
                <item.icon className={`h-7 w-7 ${isUnlocked ? "text-marker" : ""}`} strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-2xl lowercase text-cocoa dark:text-cream mb-2">{item.name}</h3>
              <p className="mb-8 flex-1 text-sm text-charcoal/70 dark:text-cream/70 leading-relaxed">{item.description}</p>

              <button
                onClick={() => handlePurchase(item)}
                disabled={!isUnlocked && !canAfford}
                className={`btn-pill w-full justify-center flex items-center gap-2 ${isUnlocked
                  ? "bg-marker text-white border-marker hover:bg-marker/90"
                  : canAfford
                    ? ""
                    : "opacity-50 cursor-not-allowed"
                  }`}
              >
                {isUnlocked ? (
                  item.id === "badge_verified" ? "equipped" :
                  item.id === "badge_vip" ? "equipped" :
                  item.id === "effect_confetti" ? "equipped" :
                  item.id.startsWith("theme_") ? (activeTheme === item.id.replace("theme_", "") ? "applied" : "apply") :
                  item.id === "filter_crt" ? (activeCrt ? "disable" : "enable") :
                  item.id === "sound_meme" ? (activeMeme ? "disable" : "enable") : "apply"
                ) : (
                  <>
                    {canAfford ? <Zap className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                    unlock for {formatCoins(item.cost)}
                  </>
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
