import { useEffect, useRef, useState, memo, useCallback } from "react";
import type { Reel } from "@/lib/reels";
import {
  Heart,
  Share2,
  Volume2,
  VolumeX,
  Play,
  MoreHorizontal,
  Bookmark,
  BookmarkCheck,
  Flag,
  Copy,
  ToggleLeft,
  ToggleRight,
  ThumbsDown,
} from "lucide-react";
import {
  isLiked as checkLiked,
  toggleLike,
  isSaved as checkSaved,
  toggleSave,
  addCoins,
  getAutoScroll,
  setAutoScroll,
  hasUnlocked,
} from "@/lib/storage";
import confetti from "canvas-confetti";

type Props = {
  reel: Reel;
  active: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onEnded: () => void;
  onWatched: () => void;
  distance: number;
};

const BUFFERING_DELAY_MS = 400;

export const ReelPlayer = memo(function ReelPlayer({
  reel,
  active,
  muted,
  onToggleMute,
  onEnded,
  onWatched,
  distance,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [is2x, setIs2x] = useState(false);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(1);
  const [showMenu, setShowMenu] = useState(false);
  const [autoScroll, setAutoScrollState] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  /** true when viewport is ≥ 768 px */
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );

  const bufferingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinsAwarded = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const heldRef = useRef(false);
  const suppressClickRef = useRef(false);
  const watchedFired = useRef(false);
  const hasPlayedRef = useRef(false);

  // ── Track viewport width for layout switching ────────────────────────────
  useEffect(() => {
    const check = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // ── Per-reel state reset ─────────────────────────────────────────────────
  useEffect(() => {
    setLiked(checkLiked(reel.id));
    setSaved(checkSaved(reel.id));
    setAutoScrollState(getAutoScroll());
    coinsAwarded.current = false;
    hasPlayedRef.current = false;
  }, [reel.id]);

  // ── Buffering helpers ────────────────────────────────────────────────────
  const showBuffering = useCallback(() => {
    if (bufferingTimer.current) return;
    bufferingTimer.current = setTimeout(() => {
      setIsBuffering(true);
      bufferingTimer.current = null;
    }, BUFFERING_DELAY_MS);
  }, []);

  const hideBuffering = useCallback(() => {
    if (bufferingTimer.current) {
      clearTimeout(bufferingTimer.current);
      bufferingTimer.current = null;
    }
    setIsBuffering(false);
  }, []);

  useEffect(() => () => {
    if (bufferingTimer.current) clearTimeout(bufferingTimer.current);
  }, []);

  // ── Active / inactive management ─────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;
    if (active) {
      if (!hasPlayedRef.current) v.currentTime = 0;
      hasPlayedRef.current = true;
      v.play().catch(() => {});
      setPaused(false);
      if (!watchedFired.current) {
        watchedFired.current = true;
        onWatched();
      }
    } else {
      v.pause();
      v.currentTime = 0;
      hasPlayedRef.current = false;
      watchedFired.current = false;
      hideBuffering();
    }
  }, [active, muted, onWatched, hideBuffering]);

  useEffect(() => {
    const v = videoRef.current;
    if (v) { v.muted = muted; v.volume = volume; }
  }, [muted, volume]);

  // ── Coins on completion ──────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active || coinsAwarded.current) return;
    const check = () => {
      if (v.duration && !isNaN(v.duration) && v.currentTime >= v.duration - 0.2) {
        addCoins(5);
        coinsAwarded.current = true;
      }
    };
    v.addEventListener("timeupdate", check);
    return () => v.removeEventListener("timeupdate", check);
  }, [active, reel.id]);

  // ── Actions ──────────────────────────────────────────────────────────────
  const doLike = () => {
    const now = toggleLike(reel);
    setLiked(now);
    if (now) { setShowHeart(true); setTimeout(() => setShowHeart(false), 700); }
  };
  const doSave = () => setSaved(toggleSave(reel));

  const onDoubleClick = () => {
    if (!liked) doLike();
    else { setShowHeart(true); setTimeout(() => setShowHeart(false), 700); }
    if (hasUnlocked("effect_confetti"))
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, zIndex: 9999 });
    if (localStorage.getItem("ig.meme_sounds") === "true") {
      const a = new Audio("https://www.myinstants.com/media/sounds/bruh.mp3");
      a.volume = 0.5; a.play().catch(() => {});
    }
    if (navigator.vibrate) navigator.vibrate(50);
  };

  const startHold = () => {
    if (holdTimer.current) window.clearTimeout(holdTimer.current);
    heldRef.current = false;
    holdTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v) v.playbackRate = 2;
      heldRef.current = true;
      setIs2x(true);
    }, 250);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    startHold();
  };

  const clearHold = () => {
    if (holdTimer.current) { window.clearTimeout(holdTimer.current); holdTimer.current = null; }
    const v = videoRef.current;
    if (v && v.playbackRate !== 1) v.playbackRate = 1;
    if (heldRef.current) {
      suppressClickRef.current = true;
      setTimeout(() => { suppressClickRef.current = false; }, 50);
    }
    heldRef.current = false;
    setIs2x(false);
  };

  const togglePlay = () => {
    if (suppressClickRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPaused(false); }
    else { v.pause(); setPaused(true); }
  };

  const share = async () => {
    const url = `${window.location.origin}/reels?start=${encodeURIComponent(reel.id)}`;
    try {
      if (navigator.share) await navigator.share({ title: reel.title ?? "Watch this reel", url });
      else await navigator.clipboard.writeText(url);
    } catch {}
  };

  const copyLink = () => { navigator.clipboard.writeText(reel.videoUrl); setShowMenu(false); };

  const reportReel = () => {
    setShowMenu(false);
    const s = encodeURIComponent(`Report Reel: ${reel.title ?? "Unknown"}`);
    const b = encodeURIComponent(`Title: ${reel.title ?? "Unknown"}\nSource: ${reel.source}\nURL: ${reel.videoUrl}`);
    window.location.href = `mailto:epowerxlabs@gmail.com?subject=${s}&body=${b}`;
  };

  const toggleAutoScroll = () => {
    const v = !autoScroll;
    setAutoScrollState(v);
    setAutoScroll(v);
    // Keep menu open so user sees the toggle change
  };

  const preload: "auto" | "metadata" | "none" =
    distance <= 2 ? "auto" : distance === 3 ? "metadata" : "none";

  // ── Shared video props ────────────────────────────────────────────────────
  const videoProps = {
    ref: videoRef,
    src: reel.videoUrl,
    playsInline: true,
    "webkit-playsinline": "true",
    disableRemotePlayback: true,
    loop: !autoScroll,
    preload: preload,
    onEnded: onEnded,
    onClick: togglePlay,
    onDoubleClick: onDoubleClick,
    onPointerDown: onPointerDown,
    onPointerUp: clearHold,
    onPointerLeave: clearHold,
    onPointerCancel: clearHold,
    onTouchStart: startHold,
    onTouchMove: clearHold,
    onTouchEnd: clearHold,
    onTouchCancel: clearHold,
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    onWaiting: showBuffering,
    onStalled: showBuffering,
    onPlaying: hideBuffering,
    onCanPlay: hideBuffering,
    onCanPlayThrough: hideBuffering,
  };

  // ── Shared overlays (pause, buffering, heart, 2x, volume) ────────────────
  const Overlays = () => (
    <>
      {is2x && (
        <div className="absolute left-1/2 top-24 z-[100] -translate-x-1/2 rounded-full bg-black/80 px-4 py-1.5 text-sm font-bold text-white pointer-events-none drop-shadow-md">
          2× Speed
        </div>
      )}
      {paused && !isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Play className="h-16 w-16 fill-white/80 text-white/80" />
        </div>
      )}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="flex gap-2">
            {[0, 150, 300].map((d) => (
              <div key={d} className="h-3 w-3 animate-bounce rounded-full bg-white shadow-lg" style={{ animationDelay: `${d}ms` }} />
            ))}
          </div>
        </div>
      )}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart className="h-32 w-32 animate-ping fill-white text-white opacity-90" />
        </div>
      )}
      {/* Volume pill */}
      <div className="absolute right-3 bottom-4 z-20 flex items-center rounded-full bg-black/50 text-white backdrop-blur group hover:bg-black/70 focus-within:bg-black/70 p-1 transition-all">
        <div className="w-0 overflow-hidden transition-all duration-300 group-hover:w-20 group-hover:px-2 focus-within:w-20 focus-within:px-2 flex items-center">
          <input
            type="range" min="0" max="1" step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              if (val > 0 && muted) onToggleMute();
              if (val === 0 && !muted) onToggleMute();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="w-full h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onToggleMute(); }}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full hover:bg-white/20 transition-colors"
        >
          {muted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </button>
      </div>
    </>
  );

  // ── Three-dots menu ───────────────────────────────────────────────────────
  // Mobile: bottom sheet sliding up; Desktop: right-side panel anchored to button
  const MenuModal = () =>
    showMenu ? (
      <>
        {/* Backdrop — tap anywhere to close */}
        <div
          className="fixed inset-0 z-[200] bg-black/40"
          onClick={() => setShowMenu(false)}
        />

        {/* MOBILE: bottom sheet */}
        <div
          className="fixed inset-x-0 bottom-0 z-[201] md:hidden"
          style={{ animation: "slideUp 0.22s cubic-bezier(0.32,0.72,0,1)" }}
        >
          <div className="w-full max-h-[80vh] flex flex-col rounded-t-2xl bg-card border-t border-border shadow-2xl">
            {/* Drag handle */}
            <div className="flex shrink-0 justify-center pt-2.5 pb-1">
              <div className="h-[3px] w-9 rounded-full bg-muted-foreground/25" />
            </div>
            {/* Scrollable content */}
            <div className="overflow-y-auto">
              {/* Video details */}
              <div className="px-4 pt-2 pb-3 border-b border-border">
                <div className="flex items-center gap-3 mb-2">
                  <div className="ig-gradient-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                    {(reel.username || reel.source)[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-card-foreground truncate">
                    {reel.username || `${reel.source}_reels`}
                  </span>
                </div>
                {reel.title && <p className="text-sm text-card-foreground font-medium leading-snug">{reel.title}</p>}
                {reel.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-3">{reel.description}</p>}
                <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  {reel.views && <span>{formatCount(reel.views)} views</span>}
                  {reel.likes && <span>{formatCount(reel.likes)} likes</span>}
                  {reel.timeAgo && <span>{reel.timeAgo}</span>}
                </div>
              </div>
              {/* Action buttons */}
              <div>
                <button onClick={copyLink} className="flex w-full items-center gap-4 px-5 py-3.5 active:bg-muted transition">
                  <Copy className="h-5 w-5 shrink-0 text-card-foreground" />
                  <span className="text-sm font-medium text-card-foreground">Copy link</span>
                </button>
                <button
                  onClick={toggleAutoScroll}
                  className="flex w-full items-center justify-between px-5 py-3.5 active:bg-muted transition"
                >
                  <div className="flex items-center gap-4">
                    {autoScroll
                      ? <ToggleRight className="h-5 w-5 shrink-0 text-cobalt-pop" />
                      : <ToggleLeft className="h-5 w-5 shrink-0 text-muted-foreground" />}
                    <span className="text-sm font-medium text-card-foreground">Auto-scroll</span>
                  </div>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${autoScroll ? "bg-cobalt-pop/15 text-cobalt-pop" : "bg-muted text-muted-foreground"}`}>
                    {autoScroll ? "ON" : "OFF"}
                  </span>
                </button>
                <div className="mx-4 border-t border-border" />
                <button onClick={reportReel} className="flex w-full items-center gap-4 px-5 py-3.5 active:bg-muted transition">
                  <Flag className="h-5 w-5 shrink-0 text-destructive" />
                  <span className="text-sm font-semibold text-destructive">Report</span>
                </button>
              </div>
              <div className="h-8" />
            </div>
          </div>
        </div>

        {/* DESKTOP: right-side panel anchored near the button */}
        <div className="fixed right-4 z-[201] hidden md:block animate-in fade-in zoom-in-95 duration-150"
          style={{ top: "50%", transform: "translateY(-30%)" }}>
          <div className="w-72 rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden">
            {/* Video details */}
            <div className="px-4 py-4 border-b border-border">
              <div className="flex items-center gap-3 mb-2">
                <div className="ig-gradient-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {(reel.username || reel.source)[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {reel.username || `${reel.source}_reels`}
                </span>
              </div>
              {reel.title && <p className="text-sm text-foreground font-medium leading-snug">{reel.title}</p>}
              {reel.description && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{reel.description}</p>}
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                {reel.views && <span>{formatCount(reel.views)} views</span>}
                {reel.likes && <span>· {formatCount(reel.likes)} likes</span>}
                {reel.timeAgo && <span>· {reel.timeAgo}</span>}
              </div>
            </div>

            {/* Actions */}
            <div className="py-2">
              <button onClick={copyLink} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted transition">
                <Copy className="h-4 w-4 shrink-0 text-foreground" />
                <span className="text-sm font-medium text-foreground">Copy link</span>
              </button>
              <button
                onClick={toggleAutoScroll}
                className="flex w-full items-center justify-between px-4 py-3 hover:bg-muted transition"
              >
                <div className="flex items-center gap-3">
                  {autoScroll
                    ? <ToggleRight className="h-4 w-4 shrink-0 text-cobalt-pop" />
                    : <ToggleLeft className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  <span className="text-sm font-medium text-foreground">Auto-scroll</span>
                </div>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${autoScroll ? "bg-cobalt-pop/10 text-cobalt-pop" : "bg-muted text-muted-foreground"}`}>
                  {autoScroll ? "ON" : "OFF"}
                </span>
              </button>
              <div className="mx-4 my-1 border-t border-border" />
              <button onClick={reportReel} className="flex w-full items-center gap-3 px-4 py-3 hover:bg-muted transition">
                <Flag className="h-4 w-4 shrink-0 text-destructive" />
                <span className="text-sm font-semibold text-destructive">Report</span>
              </button>
            </div>
          </div>
        </div>
      </>
    ) : null;

  // ── Profile info ──────────────────────────────────────────────────────────
  const ProfileInfo = ({ overlay }: { overlay: boolean }) => (
    <div className={overlay ? "pointer-events-auto" : "pointer-events-auto"}>
      <div className="flex items-center gap-3">
        <div className="ig-gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
          {(reel.username || reel.source)[0]?.toUpperCase()}
        </div>
        <span className={`text-sm font-bold truncate max-w-[180px] ${overlay ? "text-white drop-shadow-md" : "text-twilight-navy dark:text-cream-linen"}`}>
          {reel.username || `${reel.source}_reels`}
        </span>
      </div>
      {reel.title && (
        <p className={`mt-2 text-sm leading-snug break-words ${overlay ? "text-white/90 drop-shadow" : "text-twilight-navy/90 dark:text-cream-linen/90"}`}>
          {reel.title}
        </p>
      )}
      <div className={`mt-2 flex flex-wrap items-center gap-2 text-xs font-medium ${overlay ? "text-white/70 drop-shadow" : "text-slate-mist dark:text-muted-foreground"}`}>
        {reel.duration && <span>{reel.duration}</span>}
        {reel.views && <span>{formatCount(reel.views)} views</span>}
        {reel.timeAgo && <span>{reel.timeAgo}</span>}
      </div>
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP LAYOUT
  // Single video element inside a centred aspect-ratio box.
  // Profile info left | video centre | actions right
  // ─────────────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <div className="relative h-full w-full flex items-end justify-center gap-8 px-4 overflow-hidden bg-background">

        {/* Left — Profile info */}
        <div className="flex w-56 shrink-0 flex-col justify-end h-full pb-8 z-10">
          <ProfileInfo overlay={false} />
        </div>

        {/* Centre — Video (single instance) */}
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-2xl shadow-2xl"
          style={{
            height: "calc(100vh - 80px)",
            maxHeight: 820,
            aspectRatio: "9 / 16",
          }}
        >
          {reel.thumbnail && (
            <img
              src={reel.thumbnail} alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isBuffering || !active ? "opacity-60" : "opacity-0 pointer-events-none"}`}
              loading="eager" decoding="async"
            />
          )}
          <video {...videoProps} className="absolute inset-0 h-full w-full object-cover cursor-pointer" />
          <Overlays />
        </div>

        {/* Right — Action buttons */}
        <div className="flex w-20 shrink-0 flex-col items-center justify-end h-full pb-8 gap-5 z-10">
          {/* Like */}
          <button onClick={() => { doLike(); }} className="flex flex-col items-center gap-1 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
              <Heart className={`h-6 w-6 transition ${liked ? "fill-[var(--color-marker)] text-[var(--color-marker)] scale-110" : "text-foreground"}`} strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {reel.likes ? formatCount(reel.likes + (liked ? 1 : 0)) : liked ? "1" : "Like"}
            </span>
          </button>

          {/* Dislike */}
          <button className="flex flex-col items-center gap-1 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
              <ThumbsDown className="h-6 w-6 text-foreground" strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-foreground">
              {reel.dislikes ? formatCount(reel.dislikes) : "Dislike"}
            </span>
          </button>

          {/* Share */}
          <button onClick={share} className="flex flex-col items-center gap-1 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
              <Share2 className="h-6 w-6 text-foreground" strokeWidth={2} />
            </div>
            <span className="text-xs font-semibold text-foreground">Share</span>
          </button>

          {/* Save */}
          <button onClick={doSave} className="flex flex-col items-center gap-1 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
              {saved
                ? <BookmarkCheck className="h-6 w-6 fill-foreground text-foreground" strokeWidth={2} />
                : <Bookmark className="h-6 w-6 text-foreground" strokeWidth={2} />}
            </div>
            <span className="text-xs font-semibold text-foreground">{saved ? "Saved" : "Save"}</span>
          </button>

          {/* Three dots */}
          <div className="relative">
            <button onClick={() => setShowMenu(!showMenu)} className="flex flex-col items-center gap-1 group">
              <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
                <MoreHorizontal className="h-6 w-6 text-foreground" strokeWidth={2} />
              </div>
            </button>
            <MenuModal />
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOBILE LAYOUT
  // Full-screen video with overlaid UI elements
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="relative h-full w-full bg-black">
      {reel.thumbnail && (
        <img
          src={reel.thumbnail} alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isBuffering || !active ? "opacity-60" : "opacity-0 pointer-events-none"}`}
          loading="eager" decoding="async"
        />
      )}
      <video {...videoProps} className="absolute inset-0 h-full w-full object-cover cursor-pointer" />
      <Overlays />

      {/* Right action rail */}
      <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-5">
        {/* Like */}
        <button onClick={doLike} className="flex flex-col items-center gap-1">
          <Heart className={`h-8 w-8 transition ${liked ? "fill-[var(--color-marker)] text-[var(--color-marker)]" : "text-white"}`} strokeWidth={2} />
          <span className="text-xs font-medium text-white drop-shadow">
            {reel.likes ? formatCount(reel.likes + (liked ? 1 : 0)) : liked ? "1" : ""}
          </span>
        </button>

        {/* Dislike */}
        <button className="flex flex-col items-center gap-1">
          <ThumbsDown className="h-8 w-8 text-white" strokeWidth={2} />
          <span className="text-xs font-medium text-white drop-shadow">
            {reel.dislikes ? formatCount(reel.dislikes) : ""}
          </span>
        </button>

        {/* Share */}
        <button onClick={share} className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8 text-white" strokeWidth={2} />
          <span className="text-xs font-semibold text-white drop-shadow">Share</span>
        </button>

        {/* Save */}
        <button onClick={doSave} className="flex flex-col items-center gap-1">
          {saved
            ? <BookmarkCheck className="h-8 w-8 fill-white text-white" strokeWidth={2} />
            : <Bookmark className="h-8 w-8 text-white" strokeWidth={2} />}
          <span className="text-xs font-medium text-white drop-shadow">{saved ? "Saved" : "Save"}</span>
        </button>

        {/* Three dots */}
        <button onClick={() => setShowMenu(!showMenu)} className="flex flex-col items-center gap-1">
          <MoreHorizontal className="h-8 w-8 text-white" strokeWidth={2} />
        </button>
      </div>

      {/* MenuModal rendered at root level — outside overflow containers so it's never clipped */}
      <MenuModal />

      {/* Bottom caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-4 pr-20 pb-6 pointer-events-none">
        <ProfileInfo overlay />
      </div>
    </div>
  );
});

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
