import { useEffect, useRef, useState, memo, useCallback, useMemo } from "react";
import type { Reel } from "@/lib/reels";
import { Link } from "@tanstack/react-router";
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
  isFavorite,
  toggleFavorite,
  getVolume,
  setVolumeState,
  addToHistory,
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
  feedType?: string;
};

const BUFFERING_DELAY_MS = 250;

export const ReelPlayer = memo(function ReelPlayer({
  reel,
  active,
  muted,
  onToggleMute,
  onEnded,
  onWatched,
  distance,
  feedType,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [is2x, setIs2x] = useState(false);
  const [paused, setPaused] = useState(false);
  const [volume, setVolume] = useState(getVolume);
  const [showMenu, setShowMenu] = useState(false);
  const [autoScroll, setAutoScrollState] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [volumeHovered, setVolumeHovered] = useState(false);
  const [volumeInteracting, setVolumeInteracting] = useState(false);
  const volumeHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [imgError, setImgError] = useState(false);
  const [videoRatio, setVideoRatio] = useState<string>("9 / 16");
  /** true when viewport is ≥ 768 px */
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.innerWidth >= 768 : false
  );
  
  const isPortrait = useMemo(() => {
    const [w, h] = videoRatio.split("/").map(s => parseFloat(s.trim()));
    if (isNaN(w) || isNaN(h)) return true;
    return w <= h;
  }, [videoRatio]);

  const [isFav, setIsFav] = useState(false);

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
    setIsFav(isFavorite(reel.username || reel.source));
    setAutoScrollState(getAutoScroll());
    coinsAwarded.current = false;
    hasPlayedRef.current = false;
    setImgError(false);
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
        addToHistory(reel);
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
    distance <= 1 ? "auto" : distance <= 3 ? "metadata" : "none";

  // ── Volume hover helpers ──────────────────────────────────────────────────
  const showVolumeSlider = volumeHovered || volumeInteracting;

  const onVolumeAreaEnter = useCallback(() => {
    if (volumeHideTimer.current) { clearTimeout(volumeHideTimer.current); volumeHideTimer.current = null; }
    setVolumeHovered(true);
  }, []);

  const onVolumeAreaLeave = useCallback(() => {
    // Delay hiding so user can briefly move mouse between slider and icon
    volumeHideTimer.current = setTimeout(() => {
      setVolumeHovered(false);
      setVolumeInteracting(false);
    }, 300);
  }, []);

  useEffect(() => () => { if (volumeHideTimer.current) clearTimeout(volumeHideTimer.current); }, []);

  // ── Image error handler ──────────────────────────────────────────────────
  const onImgError = useCallback(() => setImgError(true), []);

  const handleLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.target as HTMLVideoElement;
    if (video.videoWidth && video.videoHeight) {
      setVideoRatio(`${video.videoWidth} / ${video.videoHeight}`);
    }
  }, []);

  // ── Shared video props ────────────────────────────────────────────────────
  const videoProps = useMemo(() => ({
    ref: videoRef,
    src: reel.videoUrl,
    playsInline: true,
    "webkit-playsinline": "true",
    disableRemotePlayback: true,
    loop: !autoScroll,
    preload: preload,
    onLoadedMetadata: handleLoadedMetadata,
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
  }), [reel.videoUrl, autoScroll, preload, onEnded, togglePlay, onDoubleClick, onPointerDown, clearHold, startHold, showBuffering, hideBuffering]);

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
      {/* Volume pill — icon always visible, slider expands on hover */}
      <div
        className={`absolute right-3 bottom-4 z-20 flex items-center rounded-full text-white backdrop-blur p-1 transition-all duration-200 ${showVolumeSlider ? "bg-black/70" : "bg-black/50"}`}
        onMouseEnter={onVolumeAreaEnter}
        onMouseLeave={onVolumeAreaLeave}
      >
        <div
          className="overflow-hidden transition-all duration-300 ease-out flex items-center"
          style={{ width: showVolumeSlider ? 88 : 0, paddingLeft: showVolumeSlider ? 8 : 0, paddingRight: showVolumeSlider ? 8 : 0 }}
        >
          <input
            type="range" min="0" max="1" step="0.01"
            value={muted ? 0 : volume}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              setVolume(val);
              setVolumeState(val);
              if (val > 0 && muted) onToggleMute();
              if (val === 0 && !muted) onToggleMute();
            }}
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => { 
              e.stopPropagation(); 
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              setVolumeInteracting(true); 
            }}
            onPointerUp={(e) => {
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              setVolumeInteracting(false);
              onVolumeAreaLeave();
            }}
            onPointerCancel={(e) => {
              (e.target as HTMLElement).releasePointerCapture(e.pointerId);
              setVolumeInteracting(false);
              onVolumeAreaLeave();
            }}
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
        {/* MOBILE Backdrop — tap anywhere to close */}
        <div
          className="fixed inset-0 z-[200] bg-black/40 md:hidden"
          onClick={() => setShowMenu(false)}
        />
        {/* DESKTOP Backdrop */}
        <div
          className="absolute inset-0 z-[200] bg-black/40 hidden md:block backdrop-blur-sm"
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
                <Link 
                  to={`/creator/${encodeURIComponent(reel.username || reel.source)}` as any}
                  className="flex items-center gap-3 mb-2 w-fit cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <div className="ig-gradient-bg flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white">
                    {(reel.username || reel.source)[0]?.toUpperCase()}
                  </div>
                  <span className="text-sm font-semibold text-card-foreground truncate">
                    {reel.username || `${reel.source}_reels`}
                  </span>
                </Link>
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

        {/* DESKTOP: Centered modal with backdrop */}
        <div className="absolute inset-0 z-[201] hidden md:flex items-center justify-center animate-in fade-in duration-150 pointer-events-none">
          <div className="relative w-64 rounded-2xl bg-popover border border-border shadow-2xl overflow-hidden z-10 animate-in zoom-in-95 duration-200 pointer-events-auto">
            {/* Video details */}
            <div className="px-4 py-3 border-b border-border bg-muted/30">
              <Link 
                to={`/creator/${encodeURIComponent(reel.username || reel.source)}` as any}
                className="flex items-center gap-3 mb-2 w-fit cursor-pointer hover:opacity-80 transition-opacity"
              >
                <div className="ig-gradient-bg flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
                  {(reel.username || reel.source)[0]?.toUpperCase()}
                </div>
                <span className="text-sm font-semibold text-foreground truncate">
                  {reel.username || `${reel.source}_reels`}
                </span>
              </Link>
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
  const showFollowButton = feedType === "latest" || feedType?.startsWith("category");

  const ProfileInfo = ({ overlay }: { overlay: boolean }) => (
    <div className={overlay ? "pointer-events-auto" : "pointer-events-auto"}>
      <div className="flex items-center gap-3 w-fit">
        <Link 
          to={`/creator/${encodeURIComponent(reel.username || reel.source)}` as any}
          className="flex items-center gap-2 cursor-pointer hover:opacity-80 transition-opacity"
        >
          <div className="ig-gradient-bg flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white">
            {(reel.username || reel.source)[0]?.toUpperCase()}
          </div>
          <span className={`text-sm font-bold truncate max-w-[150px] ${overlay ? "text-white drop-shadow-md" : "text-twilight-navy dark:text-cream-linen"}`}>
            {reel.username || `${reel.source}_reels`}
          </span>
        </Link>
        {showFollowButton && reel.source !== "local" && (
          <button 
             onClick={(e) => {
                e.stopPropagation();
                const fav = toggleFavorite(reel.username || reel.source);
                setIsFav(fav);
             }}
             className={`ml-1 px-3 py-1 rounded-full text-[11px] font-bold transition-all border ${isFav ? (overlay ? "bg-white/20 border-white/30 text-white hover:bg-white/30" : "bg-muted border-border text-foreground hover:bg-muted/80") : "bg-cobalt-pop border-cobalt-pop text-white hover:bg-cobalt-pop/90"}`}
          >
            {isFav ? "Following" : "Follow"}
          </button>
        )}
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
      <div className="relative h-full w-full flex items-center justify-center gap-4 px-4 overflow-hidden bg-background">
      
        {/* Left — Profile info (Only for portrait) */}
        {isPortrait && (
          <div className="flex w-56 shrink-0 flex-col justify-end h-full pb-12 z-10">
            <ProfileInfo overlay={false} />
          </div>
        )}

        {/* Centre — Video (single instance) */}
        <div
          className="relative flex-shrink-0 overflow-hidden rounded-2xl shadow-2xl transition-all duration-300 bg-black flex items-center justify-center group/desktop"
          style={{
            height: "calc(100vh - 100px)",
            maxHeight: 850,
            maxWidth: "calc(100vw - 200px)",
            aspectRatio: videoRatio,
          }}
        >
          {reel.thumbnail && !imgError && (
            <img
              src={reel.thumbnail} alt=""
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isBuffering || !active ? "opacity-60" : "opacity-0 pointer-events-none"}`}
              loading="eager" decoding="async"
              onError={onImgError}
            />
          )}
          <video {...videoProps} className="absolute inset-0 h-full w-full object-cover cursor-pointer" />
          <Overlays />
          
          {/* Overlaid Profile info (bottom left inside the video - Only for landscape) */}
          {!isPortrait && (
            <div className="absolute bottom-4 left-4 z-20 w-3/4 max-w-[400px] pointer-events-none">
               <div className="pointer-events-auto">
                 <ProfileInfo overlay={true} />
               </div>
            </div>
          )}
          
          <MenuModal />
        </div>

        {/* Right — Action buttons */}
        <div 
          className="flex w-16 shrink-0 flex-col items-center justify-end pb-4 gap-5 z-10"
          style={{ height: "calc(100vh - 100px)", maxHeight: 850 }}
        >
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
          <button onClick={() => setShowMenu(!showMenu)} className="flex flex-col items-center gap-1 group">
            <div className="flex h-12 w-12 items-center justify-center rounded-full hover:bg-muted transition">
              <MoreHorizontal className="h-6 w-6 text-foreground" strokeWidth={2} />
            </div>
          </button>
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
      {reel.thumbnail && !imgError && (
        <img
          src={reel.thumbnail} alt=""
          className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${isBuffering || !active ? "opacity-60" : "opacity-0 pointer-events-none"}`}
          loading="eager" decoding="async"
          onError={onImgError}
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
