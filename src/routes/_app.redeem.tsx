import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { Coins } from "lucide-react";
import { getCoins, set, KEYS } from "@/lib/storage";

export const Route = createFileRoute("/_app/redeem")({
  component: RedeemPage,
});

function RedeemPage() {
  const navigate = useNavigate();
  const [currentCoins, setCurrentCoins] = useState(0);
  const [name, setName] = useState("");
  const [coinsToRedeem, setCoinsToRedeem] = useState("");
  const [upi, setUpi] = useState("");
  const [error, setError] = useState("");

  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    setCurrentCoins(getCoins());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const amount = parseInt(coinsToRedeem, 10);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid coin amount.");
      return;
    }
    if (amount > currentCoins) {
      setError(`You only have ${currentCoins} coins available.`);
      return;
    }
    if (amount < 1000) {
      setError("Minimum redeem amount is 1000 coins.");
      return;
    }
    if (!name.trim() || !upi.trim()) {
      setError("Please fill in all fields.");
      return;
    }

    const rupees = (amount / 1000) * 10;
    
    // Deduct coins locally
    const newCoins = currentCoins - amount;
    setCurrentCoins(newCoins);
    set(KEYS.coins, newCoins);

    // Format telegram message
    const message = `Hello, I want to redeem my coins.\n\nName: ${name}\nCoins Redeemed: ${amount} (₹${rupees})\nUPI ID/Number: ${upi}`;
    const telegramUrl = `https://t.me/satyamrojha?text=${encodeURIComponent(message)}`;
    
    window.open(telegramUrl, "_blank");
    
    setIsModalOpen(false);
    setName("");
    setCoinsToRedeem("");
    setUpi("");
  };

  const rupeesValue = parseInt(coinsToRedeem, 10) > 0 ? (parseInt(coinsToRedeem, 10) / 1000) * 10 : 0;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-6 text-3xl font-bold text-twilight-navy dark:text-cream-linen">
          Redeem Coins
        </h1>

        <div className="rounded-3xl border border-twilight-navy/10 bg-cloud-white p-6 shadow-sm dark:border-periwinkle-sky/10 dark:bg-dusk-indigo flex flex-col items-center justify-center min-h-[300px]">
          <div className="mb-8 rounded-full bg-magenta-haze/10 p-8 text-center flex flex-col items-center justify-center">
            <Coins className="h-16 w-16 text-magenta-haze dark:text-periwinkle-sky mb-4" />
            <p className="text-3xl font-bold text-magenta-haze dark:text-periwinkle-sky">
              {currentCoins}
            </p>
            <p className="text-sm font-medium text-twilight-navy/80 dark:text-cream-linen/80 mt-1">
              Available Coins
            </p>
          </div>
          
          <p className="mb-8 text-center font-medium text-twilight-navy dark:text-cream-linen">
            Conversion rate: 1000 coins = ₹10
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            disabled={currentCoins < 1000}
            className={`rounded-full w-full sm:w-auto px-10 py-4 text-lg font-bold text-white shadow-md transition-transform ${
              currentCoins >= 1000 
                ? "bg-magenta-haze hover:scale-[1.02] active:scale-95" 
                : "bg-slate-mist text-twilight-navy/50 cursor-not-allowed dark:bg-secondary dark:text-cream-linen/50"
            }`}
          >
            Redeem Now
          </button>
          
          {currentCoins < 1000 && (
            <p className="mt-4 text-sm font-medium text-red-500 text-center">
              You need at least 1000 coins minimum to request a withdrawal.
            </p>
          )}
        </div>
      </div>

      {/* Redeem Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-[24px] bg-cloud-white p-6 shadow-2xl dark:bg-dusk-indigo animate-in zoom-in-95">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-mist/50 text-twilight-navy hover:bg-slate-mist dark:bg-secondary dark:text-cream-linen dark:hover:bg-secondary/80"
            >
              &times;
            </button>
            
            <h2 className="mb-6 text-2xl font-bold text-twilight-navy dark:text-cream-linen">
              Redeem Details
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-twilight-navy dark:text-cream-linen">
                  Real Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="w-full rounded-xl border border-twilight-navy/20 bg-transparent px-4 py-3 text-twilight-navy focus:border-magenta-haze focus:outline-none dark:border-periwinkle-sky/20 dark:text-cream-linen dark:focus:border-periwinkle-sky"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-twilight-navy dark:text-cream-linen">
                  Coins to Redeem
                </label>
                <input
                  type="number"
                  name="coinsToRedeem"
                  id="coinsToRedeem"
                  value={coinsToRedeem}
                  onChange={(e) => setCoinsToRedeem(e.target.value)}
                  placeholder="e.g. 1000"
                  className="w-full rounded-xl border border-twilight-navy/20 bg-transparent px-4 py-3 text-twilight-navy focus:border-magenta-haze focus:outline-none dark:border-periwinkle-sky/20 dark:text-cream-linen dark:focus:border-periwinkle-sky"
                />
                {rupeesValue > 0 && (
                  <p className="mt-2 text-sm font-bold text-green-600 dark:text-green-400">
                    You will receive: ₹{rupeesValue}
                  </p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-twilight-navy dark:text-cream-linen">
                  UPI ID or Number
                </label>
                <input
                  type="text"
                  name="upi"
                  id="upi"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  placeholder="e.g. yourname@upi or 9876543210"
                  className="w-full rounded-xl border border-twilight-navy/20 bg-transparent px-4 py-3 text-twilight-navy focus:border-magenta-haze focus:outline-none dark:border-periwinkle-sky/20 dark:text-cream-linen dark:focus:border-periwinkle-sky"
                />
              </div>

              {error && <p className="text-sm font-bold text-red-500">{error}</p>}

              <button
                type="submit"
                className="mt-6 w-full rounded-full bg-magenta-haze py-4 text-lg font-bold text-white shadow-md transition-transform hover:scale-[1.02] active:scale-95"
              >
                Submit Request
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

