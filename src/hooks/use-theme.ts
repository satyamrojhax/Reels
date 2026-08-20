import { useEffect, useState } from "react";
import { KEYS, get, set } from "@/lib/storage";

export type Theme = "light" | "dark" | "system" | "neon" | "matrix";

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    t === "dark" || t === "neon" || t === "matrix" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.classList.toggle("neon", t === "neon");
  document.documentElement.classList.toggle("matrix", t === "matrix");
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    const sync = () => {
      const t = get<Theme>(KEYS.theme, "light");
      setThemeState(t);
      apply(t);
    };
    sync();
    window.addEventListener("theme-change", sync);
    return () => window.removeEventListener("theme-change", sync);
  }, []);
  const setTheme = (t: Theme) => {
    set(KEYS.theme, t);
    setThemeState(t);
    apply(t);
  };
  return { theme, setTheme };
}
