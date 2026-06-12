// Open a Spotify URI in the native app, fall back to the web player.
// URI format examples: spotify:track:ID, spotify:playlist:ID, spotify:artist:ID, spotify:album:ID
export const openSpotify = (uri: string) => {
  if (!uri) return;
  const m = uri.match(/^spotify:(track|playlist|artist|album):([A-Za-z0-9]+)$/);
  if (!m) return;
  const [, kind, id] = m;
  const webUrl = `https://open.spotify.com/${kind}/${id}`;

  // Try the native app first; if nothing handles the URI, fall back to web after a moment.
  const start = Date.now();
  const fallback = window.setTimeout(() => {
    // If we're still in the same tab (app didn't open), go to web.
    if (Date.now() - start < 2500) window.location.href = webUrl;
  }, 800);

  try {
    window.location.href = uri;
  } catch {
    window.clearTimeout(fallback);
    window.location.href = webUrl;
  }

  // If the page becomes hidden (app opened), cancel the fallback.
  const onHide = () => {
    if (document.hidden) window.clearTimeout(fallback);
    document.removeEventListener("visibilitychange", onHide);
  };
  document.addEventListener("visibilitychange", onHide);
};
