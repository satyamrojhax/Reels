import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { getCoins, spendCoins, getUnlocks, unlockItem, hasUnlocked, set } from "@/lib/storage";
import { ShoppingBag, CheckCircle, Zap, Palette, Lock } from "lucide-react";

export const Route = createFileRoute("/_app/shop")({
  component: ShopPage,
});

type ShopItem = {
  id: string;
  name: string;
  description: string;
  icon: React.FC<{ className?: string }>;
  cost: number;
  onApply?: () => void;
};

const ITEMS: ShopItem[] = [
  {
    id: "badge_verified",
    name: "Verified Badge",
    description: "Get a glowing blue checkmark next to your name.",
    icon: CheckCircle,
    cost: 10000,
  },
  {
    id: "theme_neon",
    name: "Neon Cyberpunk Theme",
    description: "Unlock a dark futuristic aesthetic with pink and cyan glows.",
    icon: Palette,
    cost: 50000,
    onApply: () => {
      set("ig.theme", "neon");
      window.dispatchEvent(new Event("theme-change"));
    },
  },
];

function ShopPage() {
  const [coins, setCoins] = useState(0);
  const [unlocks, setUnlocks] = useState<string[]>([]);
  const [activeTheme, setActiveTheme] = useState("");

  const formatCoins = (num: number) => new Intl.NumberFormat("en-IN").format(num);

  useEffect(() => {
    setCoins(getCoins());
    setUnlocks(getUnlocks());
    const raw = localStorage.getItem("ig.theme");
    setActiveTheme(raw ? JSON.parse(raw) : "system");

    const handleCoinsChange = () => setCoins(getCoins());
    window.addEventListener("coins-change", handleCoinsChange);
    return () => window.removeEventListener("coins-change", handleCoinsChange);
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
    <div className="min-h-screen bg-background pb-20 pt-10 md:pl-[244px] md:pt-0">
      <div className="mx-auto max-w-2xl px-6 py-10 md:py-16">
        <div className="mb-10 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold text-foreground md:text-4xl">
              <ShoppingBag className="h-8 w-8 text-primary" />
              Coin Shop
            </h1>
            <p className="mt-2 text-foreground/70">
              Spend your hard-earned coins on exclusive unlockables.
            </p>
          </div>
          <div className="flex w-full items-center justify-between rounded-xl bg-card p-4 sm:w-auto sm:flex-col sm:items-end sm:bg-transparent sm:p-0">
            <span className="text-sm font-semibold uppercase tracking-widest text-foreground/50">Balance</span>
            <span className="text-2xl font-bold text-yellow-500 sm:text-3xl">{formatCoins(coins)} 🪙</span>
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          {ITEMS.map((item) => {
            const isUnlocked = unlocks.includes(item.id);
            const canAfford = coins >= item.cost;
            
            return (
              <div 
                key={item.id}
                className={`relative overflow-hidden rounded-2xl border-[1.5px] p-6 transition-all ${
                  isUnlocked 
                    ? "border-primary bg-primary/5" 
                    : canAfford 
                      ? "border-foreground/20 bg-card hover:border-primary/50" 
                      : "border-foreground/10 bg-muted/50 opacity-80"
                }`}
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-foreground/10">
                  <item.icon className={`h-6 w-6 ${isUnlocked ? "text-primary" : "text-foreground/70"}`} />
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{item.name}</h3>
                <p className="mb-6 text-sm text-foreground/70">{item.description}</p>
                
                <button
                  onClick={() => handlePurchase(item)}
                  disabled={!isUnlocked && !canAfford}
                  className={`flex w-full items-center justify-center gap-2 rounded-full py-3 text-sm font-bold uppercase tracking-wider transition ${
                    isUnlocked
                      ? "bg-primary text-primary-foreground hover:bg-primary/90"
                      : canAfford
                        ? "bg-yellow-500 text-black hover:bg-yellow-400"
                        : "bg-foreground/20 text-foreground/50 cursor-not-allowed"
                  }`}
                >
                  {isUnlocked ? (
                    item.id === "theme_neon" && activeTheme === "neon" ? "Applied" : "Apply"
                  ) : (
                    <>
                      {canAfford ? <Zap className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      Unlock for {formatCoins(item.cost)} 🪙
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
