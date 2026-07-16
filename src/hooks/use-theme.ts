import { useEffect, useState } from "react";
import { KEYS, get, set } from "@/lib/storage";

export type Theme = "light" | "dark" | "system";

function apply(t: Theme) {
  if (typeof document === "undefined") return;
  const isDark =
    t === "dark" ||
    (t === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.documentElement.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>("light");
  useEffect(() => {
    const t = get<Theme>(KEYS.theme, "light");
    setThemeState(t);
    apply(t);
  }, []);
  const setTheme = (t: Theme) => {
    set(KEYS.theme, t);
    setThemeState(t);
    apply(t);
  };
  return { theme, setTheme };
}
