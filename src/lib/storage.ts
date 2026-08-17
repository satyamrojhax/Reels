import type { Reel } from "./reels";

export const KEYS = {
  age: "ig.age_ok",
  username: "ig.username",
  pin: "ig.pin_ok",
  pinCode: "ig.pin_code",
  realName: "ig.real_name",
  dob: "ig.dob",
  liked: "ig.liked",
  saved: "ig.saved",
  watched: "ig.watched_count",
  coins: "ig.coins",
  theme: "ig.theme",
  muted: "ig.muted",
  autoScroll: "ig.auto_scroll",
  lastReelId: "ig.last_reel_id",
  lastReelIdx: "ig.last_reel_idx",
  unlocks: "ig.unlocks",
} as const;

export const isBrowser = () => typeof window !== "undefined";

export function get<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function set<T>(key: string, value: T) {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function remove(key: string) {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

export function getLiked(): Reel[] {
  return get<Reel[]>(KEYS.liked, []);
}
export function setLiked(list: Reel[]) {
  set(KEYS.liked, list);
}
export function isLiked(id: string): boolean {
  return getLiked().some((r) => r.id === id);
}
export function toggleLike(reel: Reel): boolean {
  const list = getLiked();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setLiked(list);
    return false;
  }
  list.unshift(reel);
  setLiked(list);
  return true;
}

export function getSaved(): Reel[] {
  return get<Reel[]>(KEYS.saved, []);
}
export function setSaved(list: Reel[]) {
  set(KEYS.saved, list);
}
export function isSaved(id: string): boolean {
  return getSaved().some((r) => r.id === id);
}
export function toggleSave(reel: Reel): boolean {
  const list = getSaved();
  const idx = list.findIndex((r) => r.id === reel.id);
  if (idx >= 0) {
    list.splice(idx, 1);
    setSaved(list);
    return false;
  }
  list.unshift(reel);
  setSaved(list);
  return true;
}

export function getCoins(): number {
  return get<number>(KEYS.coins, 0);
}

export function addCoins(amount: number): number {
  const current = getCoins();
  const newAmount = current + amount;
  set(KEYS.coins, newAmount);
  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
  return newAmount;
}

export function spendCoins(amount: number): boolean {
  const current = getCoins();
  if (current < amount) return false;
  set(KEYS.coins, current - amount);
  if (isBrowser()) window.dispatchEvent(new Event("coins-change"));
  return true;
}

export function getAutoScroll(): boolean {
  return get<boolean>(KEYS.autoScroll, true);
}

export function setAutoScroll(value: boolean): void {
  set(KEYS.autoScroll, value);
}

export function getUnlocks(): string[] {
  return get<string[]>(KEYS.unlocks, []);
}

export function hasUnlocked(id: string): boolean {
  return getUnlocks().includes(id);
}

export function unlockItem(id: string): void {
  const current = getUnlocks();
  if (!current.includes(id)) {
    current.push(id);
    set(KEYS.unlocks, current);
  }
}

