import "@vidstack/react/player/styles/default/theme.css";
import "@vidstack/react/player/styles/default/layouts/video.css";

import { MediaPlayer, MediaProvider, Poster } from "@vidstack/react";
import { defaultLayoutIcons, DefaultVideoLayout } from "@vidstack/react/player/layouts/default";
import { useEffect, useRef, useState } from "react";
import { getCoins, KEYS, set } from "@/lib/storage";

interface CoursePlayerProps {
  videoUrl: string;
  posterUrl?: string;
  title?: string;
  onEnded?: () => void;
}

export function CoursePlayer({ videoUrl, posterUrl, title, onEnded }: CoursePlayerProps) {
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const secondsWatchedRef = useRef(0);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      secondsWatchedRef.current += 1;
      if (secondsWatchedRef.current >= 60) {
        secondsWatchedRef.current -= 60;
        const coins = getCoins();
        set(KEYS.coins, coins + 5);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    // Automatically switch to landscape when fullscreen on mobile
    const handleFullscreenChange = () => {
      if (document.fullscreenElement) {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock("landscape").catch((err: any) => {
            console.log("Orientation lock failed", err);
          });
        }
      } else {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  return (
    <div className="aspect-video w-full overflow-hidden rounded-xl bg-black shadow-lg">
      <MediaPlayer
        ref={playerRef}
        title={title}
        src={videoUrl}
        crossOrigin
        playsInline
        className="h-full w-full"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
      >
        <MediaProvider>
          {posterUrl && <Poster className="vds-poster" src={posterUrl} alt={title} />}
        </MediaProvider>
        <DefaultVideoLayout
          icons={defaultLayoutIcons}
          thumbnails={undefined}
          color="var(--color-magenta-haze)"
        />
      </MediaPlayer>
    </div>
  );
}
