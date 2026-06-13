# Music Section v2 — Plan

## 1. Categorized auto-refresh (1 hour cache)

Edge function `spotify-browse` reworked:
- New action `home` fetches 5 category buckets via Spotify `/search?type=track`:
  - `motivational workout`, `focus study music`, `morning energy`, `gym workout`, `meditation calm`
- Also keeps existing `recommendedArtists` and `newReleases` for layout continuity.
- Adds in-memory cache keyed by `home` with 60-minute TTL (per warm instance) plus DB-backed cache in new `music_cache` table so cold starts still avoid Spotify calls within the hour.
- `search` action unchanged.

New table `music_cache`:
- `key text primary key`, `payload jsonb`, `updated_at timestamptz`
- Public read; writes via service role only from the edge function.

## 2. Playback — deep links only

Already implemented (`openSpotify` from `src/lib/spotifyLink.ts`). All track / playlist / album / artist taps continue to call it. No in-app audio.

## 3. Custom Albums

New tables:
- `user_albums` — `id`, `user_id`, `name`, `cover_url nullable`, `created_at`
- `user_album_tracks` — `id`, `album_id`, `spotify_track_id`, `name`, `artist`, `image`, `uri`, `position`, `added_at`

RLS: owner-only CRUD via `auth.uid() = user_id` (and join check for tracks).
Storage: reuse public `quote-images` bucket for optional cover uploads under `albums/{uid}/...`.

UI (top of Music tab, above search results):
- "My Albums" horizontal scroll with album tiles + leading `+` tile.
- `+` opens a sheet: name input, optional cover picker, save.
- Tapping an album opens a sheet showing its tracks with inline Spotify search to add tracks (debounced, reuses `search` action). Tap added track → deep link to Spotify. Long-press / trash icon removes a track. Delete album from sheet header.

## 4. Connect Spotify (user OAuth)

Spotify Authorization Code with PKCE (no client secret needed in browser):
- Green "Connect Spotify" button below header when not connected.
- Redirect URI: current `window.location.origin + '/spotify-callback'` (new lightweight route handled inside `Index` via URL params; no new page file needed — handle in `MusicTab` mount).
- Scopes: `playlist-read-private playlist-read-collaborative user-library-read`.
- Token + refresh stored per user in new table `spotify_connections` (`user_id pk`, `access_token`, `refresh_token`, `expires_at`, `scope`).
- Refresh handled by new edge function `spotify-user` (actions: `exchange`, `refresh`, `me-playlists`, `me-liked`). It uses `SPOTIFY_CLIENT_ID` (already a secret) and `SPOTIFY_CLIENT_SECRET` only for the token exchange/refresh server-side.
- After connect: two new sections appear — "Your Playlists" (horizontal scroll) and "Liked Songs" (list). Tap → deep link.

Required redirect URI must be whitelisted in the Spotify developer dashboard — we'll surface the exact URL to the user post-implementation.

## 5. Design

Keep existing black bg, search, category sections, "Powered by Spotify" badge, layout primitives (`Section`, `HScroll`, `ArtistTile`, `TrackRow`). New sections styled identically. Spotify-green accents for Connect button and `+` album tile.

---

## Technical detail

**Files**
- `supabase/migrations/<ts>_music_v2.sql` — `music_cache`, `user_albums`, `user_album_tracks`, `spotify_connections` + RLS + grants.
- `supabase/functions/spotify-browse/index.ts` — category buckets + DB cache.
- `supabase/functions/spotify-user/index.ts` — OAuth exchange/refresh + me-playlists / me-liked.
- `src/components/MusicTab.tsx` — new sections, Connect button, OAuth callback handling.
- `src/components/MyAlbumsSheet.tsx` (new) — create / view / edit album.
- `src/lib/spotifyConnect.ts` (new) — PKCE helpers, connection state hook.

**Order of execution**
1. Run migration.
2. Update / add edge functions.
3. Frontend changes.
4. Surface Spotify redirect URI to user for dashboard whitelisting.

No new secrets required (reuses existing `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET`).
