import { useEffect, useRef } from "react";
import Hls from "hls.js";

type Props = React.VideoHTMLAttributes<HTMLVideoElement> & { src: string };

const HlsVideo = ({ src, ...rest }: Props) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video || !src) return;
    const isHls = src.toLowerCase().includes(".m3u8");
    if (!isHls) { video.src = src; return; }
    if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = src; return;
    }
    if (Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true });
      hls.loadSource(src);
      hls.attachMedia(video);
      return () => { try { hls.destroy(); } catch { /* empty */ } };
    }
    video.src = src;
  }, [src]);
  return <video ref={ref} {...rest} />;
};

export default HlsVideo;
