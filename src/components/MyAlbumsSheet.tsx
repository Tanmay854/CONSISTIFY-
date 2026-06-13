import { useEffect, useState, useCallback } from "react";
import { X, Plus, Trash2, Search, Music2, Image as ImageIcon, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { openSpotify } from "@/lib/spotifyLink";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

const SPOTIFY_GREEN = "#1DB954";

interface Album { id: string; name: string; cover_url: string | null; }
interface AlbumTrack {
  id: string; spotify_track_id: string; name: string; artist: string;
  image: string | null; uri: string; position: number;
}
interface SearchTrack {
  id: string; name: string; artist: string; image: string | null; uri: string;
}

const callBrowse = async (params: Record<string, string>) => {
  const url = new URL(
    `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/spotify-browse`,
  );
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  const { data: { session } } = await supabase.auth.getSession();
  const res = await fetch(url.toString(), {
    headers: session ? { Authorization: `Bearer ${session.access_token}` } : {},
  });
  if (!res.ok) throw new Error(`Search failed (${res.status})`);
  return await res.json();
};

interface Props {
  open: boolean;
  album: Album | null; // null = create-mode
  onClose: () => void;
  onAlbumChanged: () => void;
}

export default function MyAlbumsSheet({ open, album, onClose, onAlbumChanged }: Props) {
  const { user } = useAuth();
  const [name, setName] = useState(album?.name || "");
  const [coverUrl, setCoverUrl] = useState<string | null>(album?.cover_url || null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [tracks, setTracks] = useState<AlbumTrack[]>([]);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchTrack[]>([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    setName(album?.name || "");
    setCoverUrl(album?.cover_url || null);
    setQuery("");
    setResults([]);
    if (album) loadTracks(album.id);
    else setTracks([]);
  }, [album?.id, open]);

  const loadTracks = async (id: string) => {
    const { data } = await supabase
      .from("user_album_tracks").select("*")
      .eq("album_id", id).order("position", { ascending: true });
    setTracks((data || []) as AlbumTrack[]);
  };

  // Debounced search
  useEffect(() => {
    if (!album) return;
    const q = query.trim();
    if (!q) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const d = await callBrowse({ action: "search", q });
        setResults(d.tracks || []);
      } finally { setSearching(false); }
    }, 300);
    return () => clearTimeout(t);
  }, [query, album?.id]);

  const handleCoverUpload = async (file: File) => {
    if (!user) return;
    setUploading(true);
    try {
      const path = `albums/${user.id}/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("quote-images").upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from("quote-images").getPublicUrl(path);
      setCoverUrl(data.publicUrl);
    } catch (e) {
      toast({ title: "Upload failed", description: e instanceof Error ? e.message : "", variant: "destructive" });
    } finally { setUploading(false); }
  };

  const saveAlbum = async () => {
    if (!user || !name.trim()) return;
    setSaving(true);
    try {
      if (album) {
        await supabase.from("user_albums").update({ name: name.trim(), cover_url: coverUrl }).eq("id", album.id);
      } else {
        await supabase.from("user_albums").insert({ user_id: user.id, name: name.trim(), cover_url: coverUrl });
      }
      onAlbumChanged();
      if (!album) onClose();
    } finally { setSaving(false); }
  };

  const addTrack = async (t: SearchTrack) => {
    if (!album) return;
    if (tracks.some((x) => x.spotify_track_id === t.id)) return;
    const position = tracks.length;
    const { data } = await supabase.from("user_album_tracks").insert({
      album_id: album.id,
      spotify_track_id: t.id,
      name: t.name, artist: t.artist, image: t.image, uri: t.uri, position,
    }).select().single();
    if (data) setTracks((prev) => [...prev, data as AlbumTrack]);
  };

  const removeTrack = async (id: string) => {
    await supabase.from("user_album_tracks").delete().eq("id", id);
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const deleteAlbum = async () => {
    if (!album) return;
    if (!confirm(`Delete "${album.name}"?`)) return;
    await supabase.from("user_albums").delete().eq("id", album.id);
    onAlbumChanged();
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col">
      <header className="flex items-center justify-between px-4 h-14 border-b border-white/10">
        <button onClick={onClose} className="text-white/70"><X size={22} /></button>
        <h2 className="font-semibold text-base">{album ? "Edit album" : "New album"}</h2>
        <button
          onClick={saveAlbum}
          disabled={!name.trim() || saving}
          className="text-sm font-semibold disabled:opacity-40"
          style={{ color: SPOTIFY_GREEN }}
        >
          Save
        </button>
      </header>

      <div className="flex-1 overflow-y-auto pb-20">
        {/* Cover + name */}
        <div className="px-4 pt-5 flex gap-4">
          <label className="relative w-24 h-24 rounded-md bg-white/10 overflow-hidden flex items-center justify-center cursor-pointer flex-shrink-0">
            {coverUrl
              ? <img src={coverUrl} alt="" className="w-full h-full object-cover" />
              : <ImageIcon size={24} className="text-white/40" />}
            {uploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <Loader2 size={20} className="animate-spin text-white" />
              </div>
            )}
            <input
              type="file" accept="image/*" className="hidden"
              onChange={(e) => e.target.files?.[0] && handleCoverUpload(e.target.files[0])}
            />
          </label>
          <div className="flex-1 flex flex-col justify-between">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Album name"
              className="w-full bg-transparent border-b border-white/15 text-lg font-semibold py-1 outline-none placeholder:text-white/40"
            />
            {album && (
              <button onClick={deleteAlbum} className="self-start text-xs text-red-400 mt-2 flex items-center gap-1">
                <Trash2 size={12} /> Delete album
              </button>
            )}
          </div>
        </div>

        {album && (
          <>
            {/* Tracks */}
            <section className="mt-6 px-4">
              <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2">Tracks ({tracks.length})</h3>
              {tracks.length === 0 && <p className="text-white/40 text-sm py-3">Search below to add tracks.</p>}
              <div className="space-y-0.5">
                {tracks.map((t) => (
                  <div key={t.id} className="flex items-center gap-3 py-2">
                    <button onClick={() => openSpotify(t.uri)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                      <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0">
                        {t.image && <img src={t.image} alt="" className="w-full h-full object-cover" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm truncate">{t.name}</p>
                        <p className="text-white/50 text-xs truncate">{t.artist}</p>
                      </div>
                    </button>
                    <button onClick={() => removeTrack(t.id)} className="text-white/40 hover:text-red-400 p-2">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            {/* Search to add */}
            <section className="mt-6 px-4">
              <h3 className="text-white/70 text-xs uppercase tracking-wider mb-2">Add from Spotify</h3>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" />
                <input
                  value={query} onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tracks"
                  className="w-full bg-white/10 rounded-full pl-10 pr-3 py-2.5 text-sm placeholder:text-white/50 outline-none"
                />
              </div>
              {searching && <p className="text-white/40 text-xs mt-3">Searching…</p>}
              <div className="mt-2 space-y-0.5">
                {results.map((t) => {
                  const added = tracks.some((x) => x.spotify_track_id === t.id);
                  return (
                    <button
                      key={t.id} disabled={added}
                      onClick={() => addTrack(t)}
                      className="w-full flex items-center gap-3 py-2 rounded-md hover:bg-white/5 text-left disabled:opacity-50"
                    >
                      <div className="w-10 h-10 rounded bg-white/10 overflow-hidden flex-shrink-0 flex items-center justify-center">
                        {t.image
                          ? <img src={t.image} alt="" className="w-full h-full object-cover" />
                          : <Music2 size={14} className="text-white/40" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{t.name}</p>
                        <p className="text-white/50 text-xs truncate">{t.artist}</p>
                      </div>
                      {added
                        ? <span className="text-xs text-white/40 pr-2">Added</span>
                        : <Plus size={16} style={{ color: SPOTIFY_GREEN }} />}
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
