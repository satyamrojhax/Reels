import { useState, useEffect } from "react";

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let isInstalled = false;
const listeners = new Set<() => void>();

const notifyListeners = () => {
  listeners.forEach((l) => l());
};

if (typeof window !== "undefined") {
  isInstalled = window.matchMedia("(display-mode: standalone)").matches;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    isInstalled = true;
    deferredPrompt = null;
    notifyListeners();
  });
}

export function usePwa() {
  const [state, setState] = useState({
    prompt: deferredPrompt,
    isInstalled,
  });

  useEffect(() => {
    const handleUpdate = () => {
      setState({
        prompt: deferredPrompt,
        isInstalled,
      });
    };
    
    listeners.add(handleUpdate);
    handleUpdate();

    return () => {
      listeners.delete(handleUpdate);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);
    if (outcome === "accepted") {
      deferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  };

  return {
    canInstall: !!state.prompt && !state.isInstalled,
    isInstalled: state.isInstalled,
    install,
  };
}
