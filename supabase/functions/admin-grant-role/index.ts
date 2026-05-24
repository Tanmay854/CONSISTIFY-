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
    if (!callerRoles || callerRoles.length === 0) return new Response(JSON.stringify({ error: "Only admins can grant roles" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { email, role } = await req.json();
    if (!email || typeof email !== "string" || !email.includes("@")) return new Response(JSON.stringify({ error: "Invalid email" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (!["admin", "uploader"].includes(role)) return new Response(JSON.stringify({ error: "Invalid role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Only super-admin may grant admin role
    if (role === "admin" && caller.email?.toLowerCase() !== SUPER_ADMIN_EMAIL) {
      return new Response(JSON.stringify({ error: "Only the super-admin can grant the admin role" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce caps
    const { count: adminCount } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    const { count: uploaderCount } = await admin.from("user_roles").select("*", { count: "exact", head: true }).eq("role", "uploader");
    if (role === "admin" && (adminCount ?? 0) >= 5) return new Response(JSON.stringify({ error: "Admin limit reached (max 5)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    if (role === "uploader" && (uploaderCount ?? 0) >= 200) return new Response(JSON.stringify({ error: "Uploader limit reached (max 200)" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: { users }, error: listError } = await admin.auth.admin.listUsers();
    if (listError) return new Response(JSON.stringify({ error: "Failed to look up users" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const target = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!target) return new Response(JSON.stringify({ error: "User not found. They must sign up first." }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // When promoting to admin: target MUST currently be an uploader, and their uploader role is removed.
    if (role === "admin") {
      const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", target.id);
      const isUploader = (targetRoles ?? []).some((r) => r.role === "uploader");
      if (!isUploader) {
        return new Response(JSON.stringify({ error: "Only existing uploaders can be promoted to admin" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      // Remove uploader role so they're admin only
      await admin.from("user_roles").delete().eq("user_id", target.id).eq("role", "uploader");
    }

    const { error: insertError } = await admin.from("user_roles").insert({ user_id: target.id, role });
    if (insertError) {
      const msg = insertError.message.includes("duplicate") ? "User already has this role" : insertError.message;
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
