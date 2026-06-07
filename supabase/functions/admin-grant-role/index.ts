import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};



const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user: caller } } = await userClient.auth.getUser();
    if (!caller) return json({ error: "Unauthorized" }, 401);

    const admin = createClient(supabaseUrl, serviceKey);
    const isSuper = caller.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

    const { data: callerRoles } = await admin
      .from("user_roles").select("role").eq("user_id", caller.id).eq("role", "admin");
    const isAdmin = !!(callerRoles && callerRoles.length > 0);

    if (!isAdmin && !isSuper) return json({ error: "Only admins can grant roles" }, 403);

    const body = await req.json().catch(() => ({}));
    const email: string = (body.email ?? "").toString().trim().toLowerCase();
    const role: string = (body.role ?? "").toString();
    const password: string | undefined = body.password ? String(body.password) : undefined;

    if (!email || !email.includes("@")) return json({ error: "Invalid email" }, 400);
    if (!["admin", "uploader"].includes(role)) return json({ error: "Invalid role" }, 400);
    if (role === "admin" && !isSuper) {
      return json({ error: "Only the super-admin can grant the admin role" }, 403);
    }
    if (password !== undefined && password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Enforce caps
    const { count: adminCount } = await admin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "admin");
    const { count: uploaderCount } = await admin
      .from("user_roles").select("*", { count: "exact", head: true }).eq("role", "uploader");
    if (role === "admin" && (adminCount ?? 0) >= 5) return json({ error: "Admin limit reached (max 5)" }, 400);
    if (role === "uploader" && (uploaderCount ?? 0) >= 200) return json({ error: "Uploader limit reached (max 200)" }, 400);

    // Find or create the target user
    const { data: list, error: listError } = await admin.auth.admin.listUsers();
    if (listError) return json({ error: "Failed to look up users" }, 500);
    let target = list.users.find((u) => u.email?.toLowerCase() === email);
    let createdAccount = false;

    if (!target) {
      // Create the auth account with the provided password
      if (!password) {
        return json({ error: "User does not exist. Provide a password to create the account." }, 400);
      }
      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createErr || !created.user) {
        return json({ error: createErr?.message || "Failed to create user" }, 400);
      }
      target = created.user;
      createdAccount = true;
    } else if (password) {
      // Update existing user's password
      const { error: updErr } = await admin.auth.admin.updateUserById(target.id, { password });
      if (updErr) return json({ error: `Failed to set password: ${updErr.message}` }, 400);
    }

    // Promotion to admin: target must currently be an uploader; remove uploader role
    if (role === "admin") {
      const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", target.id);
      const hasAdmin = (targetRoles ?? []).some((r) => r.role === "admin");
      if (hasAdmin) return json({ error: "User is already an admin" }, 400);
      await admin.from("user_roles").delete().eq("user_id", target.id).eq("role", "uploader");
    }

    const { error: insertError } = await admin.from("user_roles").insert({ user_id: target.id, role });
    if (insertError) {
      const msg = insertError.message.includes("duplicate") ? "User already has this role" : insertError.message;
      return json({ error: msg }, 400);
    }

    return json({ success: true, created: createdAccount, email, role });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
