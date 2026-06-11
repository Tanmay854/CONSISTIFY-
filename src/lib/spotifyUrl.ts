// Extract a Spotify track ID from common share formats.
// Accepts:
//   https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp
//   https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp?si=abc
//   spotify:track:3n3Ppam7vgaVa1iaRUc9Lp
//   3n3Ppam7vgaVa1iaRUc9Lp (raw id)
export function extractSpotifyTrackId(input: string): string | null {
  if (!input) return null;
  const s = input.trim();
  const url = s.match(/(?:open\.spotify\.com\/track\/|spotify:track:)([a-zA-Z0-9]{22})/);
  if (url) return url[1];
  if (/^[a-zA-Z0-9]{22}$/.test(s)) return s;
  return null;
}
