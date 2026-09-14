import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";



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

    const parsed = z.object({
      user_id: z.string().uuid(),
      role: z.enum(["admin", "uploader"]),
    }).safeParse(await req.json().catch(() => null));
    if (!parsed.success) return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const { user_id, role } = parsed.data;

    // Only super admin can remove admins
    const { data: callerSuper } = await admin.from("user_roles").select("role").eq("user_id", caller.id).eq("role", "super_admin");
    const isCallerSuper = !!(callerSuper && callerSuper.length > 0);
    if (role === "admin" && !isCallerSuper) {
      return new Response(JSON.stringify({ error: "Only the super-admin can remove admins" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Cannot remove super-admin
    if (role === "admin") {
      const { data: targetSuper } = await admin.from("user_roles").select("role").eq("user_id", user_id).eq("role", "super_admin");
      if (targetSuper && targetSuper.length > 0) {
        return new Response(JSON.stringify({ error: "Super-admin cannot be removed" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const { data: { user: target }, error: targetError } = await admin.auth.admin.getUserById(user_id);
    if (targetError || !target?.email) {
      return new Response(JSON.stringify({ error: "Staff account not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const removedAt = new Date().toISOString();
    const { error: archiveError } = await admin.from("removed_staff_accounts").insert({
      old_user_id: user_id,
      email: target.email.trim().toLowerCase(),
      former_role: role,
      removed_by: caller.id,
      removed_at: removedAt,
    });
    if (archiveError) {
      const message = archiveError.code === "23505" ? "This staff account was already removed" : archiveError.message;
      return new Response(JSON.stringify({ error: message }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: holdError } = await admin
      .from("reels")
      .update({ is_on_hold: true, held_at: removedAt, held_reason: "staff_removed" })
      .eq("uploaded_by", user_id)
      .in("feed", ["long_game", "calm_state", "quick_spark"]);
    if (holdError) {
      await admin.from("removed_staff_accounts").delete().eq("old_user_id", user_id);
      return new Response(JSON.stringify({ error: "Failed to place videos on hold: " + holdError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: roleDelErr } = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id)
      .eq("role", role);
    if (roleDelErr) {
      return new Response(JSON.stringify({ error: "Failed to remove role: " + roleDelErr.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    await admin.from("uploader_applications").delete().eq("user_id", user_id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user_id, false);
    if (deleteError) {
      return new Response(JSON.stringify({ error: "Videos are on hold, but the old login could not be deleted: " + deleteError.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ success: true, held_at: removedAt }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
