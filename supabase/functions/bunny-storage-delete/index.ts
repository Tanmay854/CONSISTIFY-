// Deletes a file from Bunny Storage. Requires admin or uploader role.
// Body: { fileUrl: string } — the CDN URL stored in audio_url / image_url.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const cleanEnv = (value: string) => value.trim().replace(/^['"]|['"]$/g, "").trim();
const cleanHost = (value: string) => cleanEnv(value).replace(/^https?:\/\//i, "").replace(/\/+$/, "");
const cleanZone = (value: string) => cleanEnv(value)
  .replace(/^https?:\/\//i, "")
  .replace(/^(?:[a-z0-9-]+\.)?storage\.bunnycdn\.com\/?/i, "")
  .replace(/^\/+|\/+$/g, "")
  .split("/")[0];
const cleanPath = (value: string) => value.trim().replace(/^\/+/, "").split("?")[0];
const storageHosts = () => {
  const aliases: Record<string, string> = {
    de: "", germany: "", default: "", ny: "ny", newyork: "ny", "new-york": "ny",
    la: "la", losangeles: "la", "los-angeles": "la", sg: "sg", singapore: "sg",
    se: "se", stockholm: "se", br: "br", brazil: "br", jh: "jh", johannesburg: "jh",
    syd: "syd", sydney: "syd",
  };
  const rawRegion = cleanEnv(Deno.env.get("BUNNY_STORAGE_REGION") || "").toLowerCase();
  const region = aliases[rawRegion] ?? rawRegion.replace(/[^a-z0-9-]/g, "");
  if (region) return [`${region}.storage.bunnycdn.com`];
  return ["storage.bunnycdn.com", "ny.storage.bunnycdn.com", "la.storage.bunnycdn.com", "sg.storage.bunnycdn.com", "se.storage.bunnycdn.com", "br.storage.bunnycdn.com", "jh.storage.bunnycdn.com", "syd.storage.bunnycdn.com"];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const zone = cleanZone(Deno.env.get("BUNNY_STORAGE_ZONE_NAME") || "");
    const password = cleanEnv(Deno.env.get("BUNNY_STORAGE_PASSWORD") || "");
    const cdnHost = cleanHost(Deno.env.get("BUNNY_STORAGE_CDN_HOSTNAME") || "");
    if (!zone || !password || !cdnHost) {
      return new Response(JSON.stringify({ error: "Bunny Storage not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = (roles || []).some((r: any) => r.role === "admin" || r.role === "super_admin");
    const isUploader = (roles || []).some((r: any) => r.role === "uploader");
    if (!isAdmin && !isUploader) return new Response(JSON.stringify({ error: "Forbidden" }),
      { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { fileUrl, filePath } = await req.json().catch(() => ({}));
    if ((typeof filePath !== "string" || !filePath) && (typeof fileUrl !== "string" || !fileUrl)) {
      return new Response(JSON.stringify({ error: "filePath or fileUrl required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only delete files on our own Bunny Storage CDN — skip Supabase storage / external URLs.
    const marker = `${cdnHost}/`;
    const idx = typeof fileUrl === "string" ? fileUrl.indexOf(marker) : -1;
    if (idx < 0 && typeof filePath !== "string") {
      return new Response(JSON.stringify({ skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const path = cleanPath(typeof filePath === "string" && filePath ? filePath : fileUrl.slice(idx + marker.length));

    // Ownership check: non-admin uploaders may only delete files they own.
    // Bunny upload pathing is `<folder>/<user.id>/...`, so verify the user id segment
    // AND cross-check against the music/quotes rows referencing this file.
    if (!isAdmin) {
      const pathOwner = path.split("/")[1] || "";
      if (pathOwner !== user.id) {
        return new Response(JSON.stringify({ error: "Forbidden — not the owner" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (typeof fileUrl === "string" && fileUrl) {
        const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
        const [{ data: musicRows }, { data: quoteRows }] = await Promise.all([
          admin.from("music").select("uploaded_by").or(`audio_url.eq.${fileUrl},image_url.eq.${fileUrl}`).limit(5),
          admin.from("quotes").select("uploaded_by").eq("image_url", fileUrl).limit(5),
        ]);
        const owners = [...(musicRows || []), ...(quoteRows || [])];
        if (owners.length > 0 && !owners.every((r: any) => r.uploaded_by === user.id)) {
          return new Response(JSON.stringify({ error: "Forbidden — not the owner" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      }
    }


    const attempts: Array<{ host: string; status: number; detail: string }> = [];
    let sawNotFound = false;
    for (const host of storageHosts()) {
      const delRes = await fetch(`https://${host}/${zone}/${path}`, {
        method: "DELETE",
        headers: { AccessKey: password },
      });
      if (delRes.ok) {
        return new Response(JSON.stringify({ deleted: true, path }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (delRes.status === 404) sawNotFound = true;
      attempts.push({ host, status: delRes.status, detail: (await delRes.text()).slice(0, 200) });
    }
    // Idempotent: if any region returned 404, the object doesn't exist in the
    // authenticated zone — treat as already deleted. 401s from other regions
    // just mean those regions host different zones (expected).
    if (sawNotFound) {
      return new Response(JSON.stringify({ deleted: true, path, alreadyMissing: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({
      error: "Bunny storage delete failed",
      detail: "Bunny Storage rejected the delete. Check that BUNNY_STORAGE_ZONE_NAME, BUNNY_STORAGE_PASSWORD, and BUNNY_STORAGE_REGION belong to the same Bunny Storage Zone.",
      attempts,
    }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    return new Response(JSON.stringify({ deleted: true, path }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
