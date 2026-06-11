// Spotify Embed iframe — official, legal, no API keys.
// Free Spotify accounts get 30s previews; Premium logged-in users get full playback.
// Streams count toward Spotify royalties.
interface Props {
  trackId: string | null;
  onClose?: () => void;
  expanded?: boolean;
}

const SpotifyEmbed = ({ trackId, onClose, expanded = false }: Props) => {
  if (!trackId) return null;
  const height = expanded ? 352 : 80;

  return (
    <div className="fixed bottom-20 left-0 right-0 z-30 px-2">
      <div className="relative bg-card/95 backdrop-blur-xl border border-border rounded-lg mx-1 shadow-2xl overflow-hidden">
        <iframe
          key={trackId}
          title="Spotify player"
          src={`https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`}
          width="100%"
          height={height}
          frameBorder={0}
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-1 right-2 text-muted-foreground text-xs h-6 w-6 rounded-full bg-background/60 backdrop-blur flex items-center justify-center hover:text-foreground"
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
