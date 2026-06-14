// Returns the public Bunny Stream library ID and CDN hostname for iframe playback.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({
      libraryId: Deno.env.get("BUNNY_STREAM_LIBRARY_ID") || null,
      cdnHostname: Deno.env.get("BUNNY_STREAM_CDN_HOSTNAME") || null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
