// Returns the public Spotify Client ID for the browser PKCE OAuth flow.
// Client ID is not a secret; client secret never leaves this server.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
  return new Response(JSON.stringify({ clientId }), {
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "public, max-age=3600" },
  });
});
