// Returns the public Spotify CLIENT_ID for browser PKCE flow.
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve((req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  return new Response(
    JSON.stringify({ client_id: Deno.env.get("SPOTIFY_CLIENT_ID") || null }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
