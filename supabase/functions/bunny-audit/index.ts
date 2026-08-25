// TEMPORARY maintenance function: audits Bunny Stream + Bunny Storage against the database.
// GET/POST { mode: "report" } -> lists orphans. { mode: "delete", confirm: true } -> deletes orphans.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const STREAM_KEY = Deno.env.get("BUNNY_STREAM_API_KEY")!;
const LIB = Deno.env.get("BUNNY_STREAM_LIBRARY_ID")!;
const ZONE = Deno.env.get("BUNNY_STORAGE_ZONE_NAME")!;
const STORAGE_PW = Deno.env.get("BUNNY_STORAGE_PASSWORD")!;

async function listStreamVideos() {
  const out: { guid: string; title: string; size: number; created: string }[] = [];
  for (let page = 1; page <= 50; page++) {
    const r = await fetch(
      `https://video.bunnycdn.com/library/${LIB}/videos?page=${page}&itemsPerPage=100`,
      { headers: { AccessKey: STREAM_KEY } },
    );
    if (!r.ok) throw new Error(`stream list ${r.status}: ${await r.text()}`);
    const j = await r.json();
    for (const v of j.items ?? []) out.push({ guid: v.guid, title: v.title, size: v.storageSize, created: v.dateUploaded });
    if (!j.items?.length || out.length >= (j.totalItems ?? 0)) break;
  }
  return out;
}

async function listStorage(prefix = "") {
  const files: { path: string; size: number; created: string }[] = [];
  const walk = async (dir: string) => {
    const r = await fetch(`https://storage.bunnycdn.com/${ZONE}/${dir}`, { headers: { AccessKey: STORAGE_PW } });
    if (!r.ok) throw new Error(`storage list ${dir} ${r.status}`);
    const items = await r.json();
    for (const it of items) {
      const p = `${dir}${it.ObjectName}`;
      if (it.IsDirectory) await walk(`${p}/`);
      else files.push({ path: p, size: it.Length, created: it.DateCreated });
    }
  };
  await walk(prefix);
  return files;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const mode = body.mode ?? "report";
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Collect every URL/reference stored in the database.
    const referenced = new Set<string>();
    const add = (v: unknown) => { if (typeof v === "string" && v) referenced.add(v.toLowerCase()); };

    const tables: [string, string[]][] = [
      ["reels", ["video_url", "thumbnail_url", "thumbnail_portrait_url", "thumbnail_landscape_url", "bunny_video_guid"]],
      ["quotes", ["image_url", "bunny_storage_path"]],
      ["music", ["audio_url", "cover_url"]],
      ["books", ["cover_url", "audio_url"]],
      ["courses", ["thumbnail_url", "video_url"]],
      ["tab_banners", ["image_url"]],
      ["daily_quotes", ["background_url"]],
      ["profiles", ["avatar_url"]],
    ];
    const tableStatus: Record<string, string> = {};
    for (const [t, cols] of tables) {
      let from = 0;
      for (;;) {
        const { data, error } = await admin.from(t).select(cols.join(",")).range(from, from + 999);
        if (error) { tableStatus[t] = `skipped: ${error.message}`; break; }
        for (const row of data ?? []) for (const c of cols) add((row as Record<string, unknown>)[c]);
        if (!data || data.length < 1000) { tableStatus[t] = `ok (${from + (data?.length ?? 0)} rows)`; break; }
        from += 1000;
      }
    }
    const refBlob = [...referenced].join("\n");

    const [videos, files] = await Promise.all([listStreamVideos(), listStorage()]);
    const orphanVideos = videos.filter((v) => !refBlob.includes(v.guid.toLowerCase()));
    const orphanFiles = files.filter((f) => {
      const name = f.path.toLowerCase();
      const base = name.split("/").pop()!;
      return !refBlob.includes(name) && !refBlob.includes(base);
    });

    const result = {
      mode,
      tableStatus,
      totals: {
        streamVideos: videos.length,
        orphanVideos: orphanVideos.length,
        orphanVideoBytes: orphanVideos.reduce((a, v) => a + (v.size || 0), 0),
        storageFiles: files.length,
        orphanFiles: orphanFiles.length,
        orphanFileBytes: orphanFiles.reduce((a, f) => a + (f.size || 0), 0),
      },
      orphanVideos: orphanVideos.slice(0, 200),
      orphanFiles: orphanFiles.slice(0, 300),
      deleted: [] as string[],
      failed: [] as string[],
    };

    if (mode === "delete" && body.confirm === true) {
      for (const v of orphanVideos) {
        const r = await fetch(`https://video.bunnycdn.com/library/${LIB}/videos/${v.guid}`, {
          method: "DELETE", headers: { AccessKey: STREAM_KEY },
        });
        (r.ok ? result.deleted : result.failed).push(`stream:${v.guid}`);
      }
      for (const f of orphanFiles) {
        const r = await fetch(`https://storage.bunnycdn.com/${ZONE}/${f.path}`, {
          method: "DELETE", headers: { AccessKey: STORAGE_PW },
        });
        (r.ok ? result.deleted : result.failed).push(`storage:${f.path}`);
      }
    }

    return json(result);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
