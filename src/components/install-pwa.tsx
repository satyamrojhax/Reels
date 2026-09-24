import { useState, useEffect } from "react";
import { X, Download } from "lucide-react";
import { usePwa } from "@/hooks/use-pwa";

export function InstallPwa() {
  const { canInstall, install } = usePwa();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Reset dismissed state if canInstall changes to true again (e.g. they uninstalled)
    if (canInstall) {
      setDismissed(false);
    }
  }, [canInstall]);

  const handleInstallClick = async () => {
    await install();
  };

  const handleDismiss = () => {
    setDismissed(true);
  };

  if (!canInstall || dismissed) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-50 w-[90%] max-w-sm -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:translate-x-0">
      <div className="flex items-center gap-4 rounded-xl border border-twilight-navy/20 bg-cloud-white p-4 shadow-lg dark:border-periwinkle-sky/20 dark:bg-dusk-indigo">
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full overflow-hidden border border-twilight-navy/10 bg-cloud-white dark:border-periwinkle-sky/10 dark:bg-dusk-indigo">
          <img src="/PWA_ICON.png" alt="App Logo" className="h-full w-full object-cover" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-twilight-navy dark:text-cream-linen">
            Install App
          </h3>
          <p className="text-xs text-slate-mist dark:text-cream-linen/70">
            Add to home screen for a better experience
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleInstallClick}
            className="rounded-full bg-cobalt-pop px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-cobalt-pop/90"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="rounded-full p-1.5 text-slate-mist transition hover:bg-slate-200 dark:text-cream-linen/70 dark:hover:bg-secondary/60"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
