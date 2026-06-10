// Wraps the official Spotify Embed iframe (legal, plays through Spotify).
// Used as the default player for all users.
import { useEffect, useRef } from "react";

interface Props {
  trackId: string | null;
  onClose?: () => void;
}

const SpotifyEmbed = ({ trackId, onClose }: Props) => {
  const ref = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    // Preload Spotify iframe API (optional, smoother controls)
    if (!document.getElementById("spotify-iframe-api")) {
      const s = document.createElement("script");
      s.id = "spotify-iframe-api";
      s.src = "https://open.spotify.com/embed/iframe-api/v1";
      s.async = true;
      document.body.appendChild(s);
    }
  }, []);

  if (!trackId) return null;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-2">
      <div className="bg-card/95 backdrop-blur-xl border border-border rounded-lg mx-1 shadow-2xl overflow-hidden">
        <iframe
          ref={ref}
          title="Spotify player"
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
          width="100%"
          height="80"
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-2 text-muted-foreground text-xs"
            aria-label="Close player"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default SpotifyEmbed;
