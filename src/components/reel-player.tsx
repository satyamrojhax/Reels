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
  MonitorUp,
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

/** Delay before showing the buffering indicator (ms).
 *  Sub-threshold stalls are invisible — no more false spinner flashes. */
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
  const [showMenu, setShowMenu] = useState(false);
  const [autoScroll, setAutoScrollState] = useState(true);
  /** Buffering is only shown after a 400 ms debounce to prevent flashes. */
  const [isBuffering, setIsBuffering] = useState(false);
  const bufferingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const coinsAwarded = useRef(false);
  const holdTimer = useRef<number | null>(null);
  const holdStart = useRef<number>(0);
  const heldRef = useRef(false);
  const suppressClickRef = useRef(false);
  const watchedFired = useRef(false);
  const hasPlayedRef = useRef(false);

  // ─── Initialise per-reel state ─────────────────────────────────────────────
  useEffect(() => {
    setLiked(checkLiked(reel.id));
    setSaved(checkSaved(reel.id));
    setAutoScrollState(getAutoScroll());
    coinsAwarded.current = false;
    hasPlayedRef.current = false;
  }, [reel.id]);

  // ─── Debounced buffering helpers ───────────────────────────────────────────
  const showBuffering = useCallback(() => {
    if (bufferingTimer.current) return; // already scheduled
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

  // ─── Cleanup buffering timer on unmount ────────────────────────────────────
  useEffect(() => {
    return () => {
      if (bufferingTimer.current) {
        clearTimeout(bufferingTimer.current);
      }
    };
  }, []);

  // ─── Active / Inactive management ─────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = muted;

    if (active) {
      // Don't reset currentTime if video has already buffered — avoids a
      // seek-triggered re-buffer on the first few frames.
      if (!hasPlayedRef.current) {
        v.currentTime = 0;
      }
      hasPlayedRef.current = true;

      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
      setPaused(false);

      if (!watchedFired.current) {
        watchedFired.current = true;
        onWatched();
      }
    } else {
      v.pause();
      // Reset so next activation starts fresh
      v.currentTime = 0;
      hasPlayedRef.current = false;
      watchedFired.current = false;
      hideBuffering();
    }
  }, [active, muted, onWatched, hideBuffering]);

  // ─── Muted-only sync (don't restart video) ────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.muted = muted;
  }, [muted]);

  // ─── Coins on completion ───────────────────────────────────────────────────
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !active || coinsAwarded.current) return;

    const checkProgress = () => {
      if (v.duration && !isNaN(v.duration) && v.currentTime >= v.duration - 0.2) {
        addCoins(5);
        coinsAwarded.current = true;
      }
    };

    v.addEventListener("timeupdate", checkProgress);
    return () => v.removeEventListener("timeupdate", checkProgress);
  }, [active, reel.id]);

  // ─── Actions ───────────────────────────────────────────────────────────────
  const doLike = () => {
    const now = toggleLike(reel);
    setLiked(now);
    if (now) {
      setShowHeart(true);
      window.setTimeout(() => setShowHeart(false), 700);
    }
  };

  const doSave = () => {
    const now = toggleSave(reel);
    setSaved(now);
  };

  const onDoubleClick = () => {
    if (!liked) doLike();
    else {
      setShowHeart(true);
      window.setTimeout(() => setShowHeart(false), 700);
    }

    if (hasUnlocked("effect_confetti")) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        zIndex: 9999,
      });
    }

    if (localStorage.getItem("ig.meme_sounds") === "true") {
      const audio = new Audio("https://www.myinstants.com/media/sounds/bruh.mp3");
      audio.volume = 0.5;
      audio.play().catch(() => {});
    }

    if (typeof navigator !== "undefined" && navigator.vibrate) navigator.vibrate(50);
  };

  const onPointerDown = () => {
    heldRef.current = false;
    holdStart.current = Date.now();
    holdTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v) v.playbackRate = 2;
      heldRef.current = true;
      setIs2x(true);
    }, 140);
  };

  const onContextMenu = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
  };

  const clearHold = () => {
    if (holdTimer.current) {
      window.clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    const v = videoRef.current;
    if (v && v.playbackRate !== 1) v.playbackRate = 1;
    if (heldRef.current) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 50);
    }
    heldRef.current = false;
    setIs2x(false);
  };

  const togglePlay = () => {
    if (suppressClickRef.current) return;
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => {});
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const share = async () => {
    const deepLink =
      typeof window !== "undefined"
        ? `${window.location.origin}/reels?start=${encodeURIComponent(reel.id)}`
        : reel.videoUrl;
    const shareData = {
      title: reel.title ?? "Watch this reel",
      text: reel.title ?? "Check out this reel",
      url: deepLink,
    };
    try {
      if (navigator.share) await navigator.share(shareData);
      else await navigator.clipboard.writeText(deepLink);
    } catch {}
  };

  const copyLink = () => {
    navigator.clipboard.writeText(reel.videoUrl);
    setShowMenu(false);
  };

  const reportReel = () => {
    setShowMenu(false);
    const subject = encodeURIComponent(`Report Reel: ${reel.title ?? "Unknown"}`);
    const body = encodeURIComponent(
      `I would like to report this reel:\n\n` +
        `Title: ${reel.title ?? "Unknown"}\n` +
        `Source: ${reel.source}\n` +
        `Video URL: ${reel.videoUrl}\n\n` +
        `Please review this content.`,
    );
    window.location.href = `mailto:epowerxlabs@gmail.com?subject=${subject}&body=${body}`;
  };

  const toggleAutoScroll = () => {
    const newValue = !autoScroll;
    setAutoScrollState(newValue);
    setAutoScroll(newValue);
    setShowMenu(false);
  };

  // ─── Preload strategy ─────────────────────────────────────────────────────
  // distance 0 (active)  → auto   (full buffer, playing)
  // distance 1–2         → auto   (eagerly pre-buffer next two reels)
  // distance 3           → metadata (fetch headers / duration only)
  // distance 4+          → none   (placeholder thumbnail only)
  const preloadAttr: "auto" | "metadata" | "none" =
    distance <= 2 ? "auto" : distance === 3 ? "metadata" : "none";

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      {/* Thumbnail placeholder — shown until video paints its first frame */}
      {reel.thumbnail && (
        <img
          src={reel.thumbnail}
          alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${
            isBuffering || !active ? "opacity-60" : "opacity-0 pointer-events-none"
          }`}
          loading="eager"
          decoding="async"
        />
      )}

      <video
        ref={videoRef}
        src={reel.videoUrl}
        className="absolute inset-0 h-full w-full object-contain"
        playsInline
        webkit-playsinline="true"
        disableRemotePlayback
        loop={!autoScroll}
        preload={preloadAttr}
        onEnded={onEnded}
        onClick={togglePlay}
        onDoubleClick={onDoubleClick}
        onPointerDown={onPointerDown}
        onPointerUp={clearHold}
        onPointerLeave={clearHold}
        onPointerCancel={clearHold}
        onContextMenu={onContextMenu}
        onWaiting={showBuffering}
        onStalled={showBuffering}
        onPlaying={hideBuffering}
        onCanPlay={hideBuffering}
        onCanPlayThrough={hideBuffering}
        // Don't trigger buffering on loadstart — it fires even for cached content
      />

      {/* Mute toggle */}
      <button
        onClick={onToggleMute}
        className="absolute right-4 top-4 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur"
        aria-label={muted ? "Unmute" : "Mute"}
      >
        {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
      </button>

      {/* 2× pill */}
      {is2x && (
        <div className="absolute left-1/2 top-4 z-20 -translate-x-1/2 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
          2× Speed
        </div>
      )}

      {/* Pause overlay */}
      {paused && !isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Play className="h-20 w-20 fill-white/80 text-white/80" />
        </div>
      )}

      {/* Buffering spinner — only shown after 400 ms stall */}
      {isBuffering && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <div className="relative flex h-14 w-14 items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-white/20" />
            <div className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-white" />
          </div>
        </div>
      )}

      {/* Double-tap heart */}
      {showHeart && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <Heart className="h-32 w-32 animate-ping fill-white text-white opacity-90" />
        </div>
      )}

      {/* Right action rail */}
      <div className="absolute bottom-24 right-3 z-20 flex flex-col items-center gap-5">
        <button
          onClick={() => {
            doLike();
            if (!liked && localStorage.getItem("ig.meme_sounds") === "true") {
              const audio = new Audio(
                "https://www.myinstants.com/media/sounds/anime-wow-sound-effect.mp3",
              );
              audio.volume = 0.5;
              audio.play().catch(() => {});
            }
          }}
          className="flex flex-col items-center gap-1"
        >
          <Heart
            className={`h-8 w-8 transition ${liked ? "fill-[var(--color-marker)] text-[var(--color-marker)] scale-110" : "text-white"}`}
            strokeWidth={2}
          />
          <span className="text-xs font-medium lowercase text-white">
            {reel.likes ? formatCount(reel.likes + (liked ? 1 : 0)) : liked ? "liked" : "like"}
          </span>
        </button>

        <button onClick={doSave} className="flex flex-col items-center gap-1">
          {saved ? (
            <BookmarkCheck className="h-8 w-8 fill-white text-white" strokeWidth={2} />
          ) : (
            <Bookmark className="h-8 w-8 text-white" strokeWidth={2} />
          )}
          <span className="text-xs font-medium lowercase text-white">
            {saved ? "saved" : "save"}
          </span>
        </button>

        <button onClick={share} className="flex flex-col items-center gap-1">
          <Share2 className="h-8 w-8 text-white" strokeWidth={2} />
          <span className="text-xs font-semibold text-white">Share</span>
        </button>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex flex-col items-center gap-1"
          >
            <MoreHorizontal className="h-8 w-8 text-white" strokeWidth={2} />
          </button>
          {showMenu && (
            <div className="absolute bottom-full right-0 mb-2 w-48 rounded-lg bg-black/90 p-2 backdrop-blur">
              <button
                onClick={copyLink}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-white hover:bg-white/10"
              >
                <Copy className="h-4 w-4" />
                <span className="text-sm">Copy link</span>
              </button>
              <button
                onClick={toggleAutoScroll}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-white hover:bg-white/10"
              >
                {autoScroll ? (
                  <ToggleRight className="h-4 w-4" />
                ) : (
                  <ToggleLeft className="h-4 w-4" />
                )}
                <span className="text-sm">Auto scroll {autoScroll ? "on" : "off"}</span>
              </button>
              <button
                onClick={() => {
                  setShowMenu(false);
                  if (videoRef.current && document.pictureInPictureEnabled) {
                    videoRef.current.requestPictureInPicture().catch(() => {});
                  }
                }}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-white hover:bg-white/10"
              >
                <MonitorUp className="h-4 w-4 shrink-0" />
                <span className="text-sm truncate">Picture-in-Picture</span>
              </button>
              <button
                onClick={reportReel}
                className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-white hover:bg-white/10"
              >
                <Flag className="h-4 w-4" />
                <span className="text-sm">Report</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom caption */}
      <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 pr-20 pb-6">
        <div className="flex items-center gap-2">
          <div className="ig-gradient-bg flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white">
            {reel.source[0]?.toUpperCase()}
          </div>
          <span className="text-sm font-semibold text-white">@{reel.source}_reels</span>
        </div>
        {reel.title && (
          <p className="mt-2 text-sm text-white whitespace-pre-wrap break-words break-all">
            {reel.title}
            {reel.description && (
              <span className="mt-1 block text-white/80">{reel.description}</span>
            )}
          </p>
        )}
        <div className="mt-2 flex items-center gap-3 text-xs text-white/70">
          {reel.duration && <span>{reel.duration}</span>}
          {reel.views && <span>{formatCount(reel.views)} views</span>}
          {reel.timeAgo && <span>{reel.timeAgo}</span>}
        </div>
      </div>
    </div>
  );
});

function formatCount(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}
