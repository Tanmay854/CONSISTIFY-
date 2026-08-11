import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url } = await req.json();
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const rows: { category: string; subcategory: string; text: string }[] = await (await fetch(url)).json();

    // Existing texts (unique index is on lower(btrim(text)))
    const seen = new Set<string>();
    for (let from = 0; ; from += 1000) {
      const { data, error } = await admin.from("daily_quotes").select("text").range(from, from + 999);
      if (error) throw new Error(JSON.stringify(error));
      for (const r of data ?? []) seen.add(r.text.trim().toLowerCase());
      if (!data || data.length < 1000) break;
    }

    const fresh: typeof rows = [];
    for (const r of rows) {
      const k = r.text.trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      fresh.push(r);
    }

    let inserted = 0;
    for (let i = 0; i < fresh.length; i += 500) {
      const chunk = fresh.slice(i, i + 500);
      const { error } = await admin.from("daily_quotes").insert(chunk);
      if (error) throw new Error(JSON.stringify(error));
      inserted += chunk.length;
    }
    return new Response(JSON.stringify({ inserted, skipped: rows.length - fresh.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
