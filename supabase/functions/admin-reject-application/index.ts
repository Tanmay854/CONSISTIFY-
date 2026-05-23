import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPER_ADMIN_EMAIL = "tanmaynimbalkar854@gmail.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Missing authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: callerRoles } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    if (!callerRoles || callerRoles.length === 0) {
      return new Response(JSON.stringify({ error: "Only admins can reject applications" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { application_id } = await req.json();
    if (!application_id) {
      return new Response(JSON.stringify({ error: "application_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: app } = await admin.from("uploader_applications").select("user_id").eq("id", application_id).maybeSingle();
    if (!app) return new Response(JSON.stringify({ error: "Application not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Protect super-admin
    const { data: { user: target } } = await admin.auth.admin.getUserById(app.user_id);
    if (target?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Cannot reject super-admin" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Delete the auth user first so the email is definitely freed for re-application.
    const { error: authDelErr } = await admin.auth.admin.deleteUser(app.user_id, false);
    if (authDelErr) {
      return new Response(JSON.stringify({ error: "Failed to delete account: " + authDelErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    await admin.from("user_roles").delete().eq("user_id", app.user_id);
    await admin.from("uploader_applications").delete().eq("user_id", app.user_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
