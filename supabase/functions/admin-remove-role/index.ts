import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    const isCallerAdmin = !!callerRoles && callerRoles.length > 0;
    if (!isCallerAdmin) return new Response(JSON.stringify({ error: "Only admins can remove roles" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { user_id, role } = await req.json();
    if (!user_id || !["admin", "uploader"].includes(role)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Only super admin can remove admins
    if (role === "admin" && caller.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Only the super-admin can remove admins" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cannot remove super-admin
    if (role === "admin") {
      const { data: { user: target } } = await admin.auth.admin.getUserById(user_id);
      if (target?.email?.toLowerCase() === SUPER_ADMIN_EMAIL) {
        return new Response(JSON.stringify({ error: "Super-admin cannot be removed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { error: delErr } = await admin.from("user_roles").delete().eq("user_id", user_id).eq("role", role);
    if (delErr) return new Response(JSON.stringify({ error: delErr.message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
