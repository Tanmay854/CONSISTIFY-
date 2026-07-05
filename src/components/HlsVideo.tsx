import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import Hls from "hls.js";

type Props = React.VideoHTMLAttributes<HTMLVideoElement> & { src: string };

// Detect native HLS (Safari / iOS WKWebView). Android WebView cannot play HLS natively — always use hls.js there.
const hasNativeHls = (video: HTMLVideoElement): boolean => {
  if (typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua);
  if (isAndroid) return false; // Android WebView lies about canPlayType; force MSE
  const t = video.canPlayType("application/vnd.apple.mpegurl");
  return t === "probably" || t === "maybe";
};

const HlsVideo = forwardRef<HTMLVideoElement, Props>(({ src, ...rest }, forwardedRef) => {
  const ref = useRef<HTMLVideoElement>(null);
  useImperativeHandle(forwardedRef, () => ref.current as HTMLVideoElement);

  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;

    // Attributes required for inline autoplay inside Android/iOS WebView (Capacitor, RN WebView, Flutter).
    video.setAttribute("playsinline", "");
    video.setAttribute("webkit-playsinline", "");
    video.setAttribute("x5-playsinline", "");
    video.setAttribute("x5-video-player-type", "h5-page");
    video.setAttribute("x5-video-player-fullscreen", "false");

    const isHls = /\.m3u8(\?|$)/i.test(src);
    let hls: Hls | null = null;

    if (!isHls) {
      video.src = src;
    } else if (Hls.isSupported()) {
      // Prefer hls.js everywhere MSE is available (all modern Android WebViews, desktop Chromium/Firefox).
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
      });
      hls.loadSource(src);
      hls.attachMedia(video);
      hls.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal || !hls) return;
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
      });
    } else if (hasNativeHls(video)) {
      // iOS Safari / WKWebView
      video.src = src;
    } else {
      // Last-resort: let the platform try.
      video.src = src;
    }

    return () => {
      if (hls) { try { hls.destroy(); } catch { /* empty */ } }
    };
  }, [src]);

  return (
    <video
      ref={ref}
      playsInline
      preload="auto"
      crossOrigin="anonymous"
      {...rest}
    />
  );
});

HlsVideo.displayName = "HlsVideo";

export default HlsVideo;
