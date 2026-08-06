import { useCallback, useEffect, useRef, useState } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, Minimize, RotateCcw, RotateCw } from "lucide-react";
import HlsVideo from "./HlsVideo";

type Fit = "contain" | "cover";

type Props = {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  fit?: Fit;
  className?: string;
  /**
   * When true, the player fills the wrapping container. When false, uses aspect-video.
   */
  fill?: boolean;
  /** Show a rotate-to-landscape control (long-form videos). */
  allowRotate?: boolean;

};

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

/**
 * In-app custom video player. Works inside Android WebView (Capacitor APK)
 * where the browser's default <video> controls are unreliable / missing.
 * Provides: play/pause, ±10s skip, scrub, mute, fullscreen.
 */
const VideoPlayer = ({
  src,
  poster,
  autoPlay = false,
  loop = false,
  muted: initialMuted = false,
  fit = "contain",
  className = "",
  fill = false,
  allowRotate = false,
}: Props) => {

  const wrapperRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef<number | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFs, setIsFs] = useState(false);
  const [scrubbing, setScrubbing] = useState(false);

  const scheduleHide = useCallback(() => {
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (!scrubbing) setShowControls(false);
    }, 2500);
  }, [scrubbing]);

  const revealControls = useCallback(() => {
    setShowControls(true);
    scheduleHide();
  }, [scheduleHide]);

  useEffect(() => {
    scheduleHide();
    return () => { if (hideTimer.current) window.clearTimeout(hideTimer.current); };
  }, [scheduleHide]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
    revealControls();
  }, [revealControls]);

  const seekBy = (delta: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min((v.duration || 0), v.currentTime + delta));
    revealControls();
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, t));
    setCurrent(v.currentTime);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
    revealControls();
  };

  type OrientationLock = ScreenOrientation & {
    lock?: (o: string) => Promise<void>;
    unlock?: () => void;
  };

  const toggleFs = async () => {
    const el = wrapperRef.current;
    if (!el) return;
    const orientation = (typeof screen !== "undefined" ? screen.orientation : undefined) as OrientationLock | undefined;
    try {
      if (!document.fullscreenElement) {
        await el.requestFullscreen?.();
        if (allowRotate) {
          try { await orientation?.lock?.("landscape"); } catch { /* not supported */ }
        }
      } else {
        try { orientation?.unlock?.(); } catch { /* not supported */ }
        await document.exitFullscreen?.();
      }
    } catch { /* empty */ }
    revealControls();
  };


  useEffect(() => {
    const onFs = () => {
      const fs = !!document.fullscreenElement;
      setIsFs(fs);
      if (!fs) {
        try { (screen.orientation as ScreenOrientation & { unlock?: () => void })?.unlock?.(); } catch { /* empty */ }
      }
    };
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);


  const onBarPointer = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    seekTo(pct * (duration || 0));
    revealControls();
  };

  return (
    <div
      ref={wrapperRef}
      className={`relative bg-black overflow-hidden select-none ${fill ? "w-full h-full" : "w-full aspect-video"} ${className}`}
      onPointerMove={revealControls}
      onClick={() => {
        // Single tap toggles controls; if hidden, show; if shown, toggle play
        if (!showControls) { revealControls(); return; }
        togglePlay();
      }}
    >
      <HlsVideo
        ref={videoRef}
        src={src}
        poster={poster}
        autoPlay={autoPlay}
        loop={loop}
        muted={muted}
        playsInline
        className="w-full h-full"
        style={{ objectFit: fit, backgroundColor: "black" }}
        onPlay={() => { setPlaying(true); revealControls(); }}
        onPause={() => { setPlaying(false); setShowControls(true); }}
        onWaiting={() => setLoading(true)}
        onCanPlay={() => setLoading(false)}
        onPlaying={() => setLoading(false)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => {
          if (!scrubbing) setCurrent(e.currentTarget.currentTime);
          const b = e.currentTarget.buffered;
          if (b.length) setBuffered(b.end(b.length - 1));
        }}
      />

      {/* Loading spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="h-10 w-10 rounded-full border-2 border-white/25 border-t-white animate-spin" />
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-200 ${showControls ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top gradient */}
        <div className="h-16 bg-gradient-to-b from-black/60 to-transparent" />

        {/* Center controls */}
        <div className="flex items-center justify-center gap-8">
          <button
            aria-label="Rewind 10 seconds"
            onClick={() => seekBy(-10)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <RotateCcw size={22} />
          </button>
          <button
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/95 flex items-center justify-center text-black active:scale-95 transition-transform shadow-lg"
          >
            {playing ? <Pause size={28} className="fill-black" /> : <Play size={28} className="fill-black ml-0.5" />}
          </button>
          <button
            aria-label="Forward 10 seconds"
            onClick={() => seekBy(10)}
            className="w-12 h-12 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white active:scale-95 transition-transform"
          >
            <RotateCw size={22} />
          </button>
        </div>

        {/* Bottom bar */}
        <div className="px-4 pb-3 pt-8 bg-gradient-to-t from-black/70 to-transparent">
          {/* Scrub track */}
          <div
            className="relative h-6 flex items-center touch-none cursor-pointer"
            onPointerDown={(e) => {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              setScrubbing(true);
              onBarPointer(e);
            }}
            onPointerMove={(e) => { if (scrubbing) onBarPointer(e); }}
            onPointerUp={() => { setScrubbing(false); scheduleHide(); }}
            onPointerCancel={() => { setScrubbing(false); scheduleHide(); }}
          >
            <div className="relative w-full h-1 rounded-full bg-white/25 overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 bg-white/40"
                style={{ width: `${duration ? (buffered / duration) * 100 : 0}%` }}
              />
              <div
                className="absolute inset-y-0 left-0 bg-white"
                style={{ width: `${duration ? (current / duration) * 100 : 0}%` }}
              />
            </div>
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow"
              style={{ left: `calc(${duration ? (current / duration) * 100 : 0}% - 7px)` }}
            />
          </div>

          <div className="mt-1.5 flex items-center justify-between text-white text-[11px] font-medium tabular-nums">
            <span>{fmt(current)} / {fmt(duration)}</span>
            <div className="flex items-center gap-2">
              <button
                aria-label={muted ? "Unmute" : "Mute"}
                onClick={toggleMute}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                {muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </button>
              <button
                aria-label={isFs ? "Exit fullscreen" : "Enter fullscreen"}
                onClick={toggleFs}
                className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center"
              >
                {isFs ? <Minimize size={16} /> : <Maximize size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
