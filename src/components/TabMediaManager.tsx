import { useCallback, useEffect, useRef, useState } from "react";
import { Trash2, Upload, Plus, Image as ImageIcon, Quote as QuoteIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { VIDEO_FEEDS } from "@/lib/videoFeeds";
import { QUOTE_CATEGORIES, findCategory, subLabel } from "@/lib/quoteTopics";
import { parseQuotePdf, parseQuoteText } from "@/lib/parseQuotePdf";

type Section = "banners" | "backgrounds" | "quotes";

interface BannerRow { id: string; tab: string; image_url: string; position: number }
interface BgRow { id: string; image_url: string; name: string | null; position: number }
interface QuoteRow { id: string; text: string; author: string | null; category: string | null; subcategory: string | null }


const uploadImage = async (file: File, prefix: string): Promise<string | null> => {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${prefix}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("quote-images").upload(path, file, { upsert: false });
  if (error) return null;
  return supabase.storage.from("quote-images").getPublicUrl(path).data.publicUrl;
};

const TabMediaManager = () => {
  const { user } = useAuth();
  const [section, setSection] = useState<Section>("banners");

  // Banners
  const [tab, setTab] = useState<string>(VIDEO_FEEDS[0].id);
  const [banners, setBanners] = useState<BannerRow[]>([]);
  const bannerInput = useRef<HTMLInputElement>(null);

  // Backgrounds
  const [backgrounds, setBackgrounds] = useState<BgRow[]>([]);
  const bgInput = useRef<HTMLInputElement>(null);

  // Quotes
  const [quotes, setQuotes] = useState<QuoteRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [totalQuotes, setTotalQuotes] = useState(0);
  const [bulkAll, setBulkAll] = useState("");


  const [qCat, setQCat] = useState<string>(QUOTE_CATEGORIES[0].id);
  const [qSub, setQSub] = useState<string>(QUOTE_CATEGORIES[0].subs[0].id);
  const pdfInput = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [b, bg, q, all] = await Promise.all([
      supabase.from("tab_banners").select("id,tab,image_url,position").order("position"),
      supabase.from("quote_backgrounds").select("id,image_url,name,position").order("position"),
      supabase.from("daily_quotes").select("id,text,author,category,subcategory").order("created_at", { ascending: false }).limit(1000),
      supabase.from("daily_quotes").select("category,subcategory").limit(50000),
    ]);

    setBanners((b.data as BannerRow[]) || []);
    setBackgrounds((bg.data as BgRow[]) || []);
    setQuotes((q.data as QuoteRow[]) || []);
    const map: Record<string, number> = {};
    (all.data ?? []).forEach((r) => {
      const key = `${r.category}|${r.subcategory}`;
      map[key] = (map[key] || 0) + 1;
    });
    setCounts(map);
    setTotalQuotes((all.data ?? []).length);
  }, []);


  useEffect(() => { load(); }, [load]);

  const tabBanners = banners.filter((b) => b.tab === tab);

  const addBanners = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMessage(null);
    const room = 5 - tabBanners.length;
    if (room <= 0) { setMessage("This tab already has 5 images."); setBusy(false); return; }
    const list = Array.from(files).slice(0, room);
    for (let i = 0; i < list.length; i++) {
      const url = await uploadImage(list[i], `banners/${tab}`);
      if (!url) { setMessage("Upload failed"); continue; }
      const { error } = await supabase.from("tab_banners").insert({
        tab, image_url: url, position: tabBanners.length + i, created_by: user?.id,
      });
      if (error) setMessage(error.message);
    }
    await load();
    setBusy(false);
  };

  const addBackgrounds = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMessage(null);
    const list = Array.from(files);
    const rows: { image_url: string; name: string; position: number; created_by: string | undefined }[] = [];
    for (let i = 0; i < list.length; i++) {
      const url = await uploadImage(list[i], "quote-bg");
      if (url) rows.push({ image_url: url, name: list[i].name, position: backgrounds.length + i, created_by: user?.id });
    }
    if (rows.length) {
      const { error } = await supabase.from("quote_backgrounds").insert(rows);
      if (error) setMessage(error.message);
    }
    await load();
    setBusy(false);
  };

  /**
   * Inserts quotes while guaranteeing no duplicates: text is de-duplicated
   * within the batch and against everything already stored (case/whitespace
   * insensitive). The database also enforces this with a unique index.
   */
  const insertUnique = async (
    parsed: { text: string; category: string; subcategory: string }[],
  ): Promise<{ added: number; skipped: number; error?: string }> => {
    const { data: existing } = await supabase.from("daily_quotes").select("text").limit(50000);
    const seen = new Set((existing ?? []).map((e) => (e.text || "").trim().toLowerCase()));
    const rows: { text: string; category: string; subcategory: string; author: null; created_by?: string }[] = [];
    for (const p of parsed) {
      const key = p.text.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      rows.push({ ...p, text: p.text.trim(), author: null, created_by: user?.id });
    }
    let added = 0;
    for (let i = 0; i < rows.length; i += 200) {
      const { error } = await supabase.from("daily_quotes").insert(rows.slice(i, i + 200));
      if (error) return { added, skipped: parsed.length - rows.length, error: error.message };
      added += Math.min(200, rows.length - i);
    }
    return { added, skipped: parsed.length - rows.length };
  };

  const importPdfs = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMessage("Reading PDFs...");
    let total = 0;
    let skipped = 0;
    for (const file of Array.from(files)) {
      try {
        const parsed = await parseQuotePdf(file);
        if (!parsed.length) { setMessage(`No quotes found in ${file.name}`); continue; }
        const res = await insertUnique(parsed);
        total += res.added;
        skipped += res.skipped;
        if (res.error) { setMessage(res.error); break; }
      } catch (e) {
        setMessage(`Failed to read ${file.name}: ${(e as Error).message}`);
      }
    }
    if (total || skipped) setMessage(`Imported ${total} quotes (${skipped} duplicates skipped)`);
    await load();
    setBusy(false);
  };

  // Bulk import across every category / subcategory at once
  const importAllTopics = async () => {
    const parsed = parseQuoteText(bulkAll);
    if (!parsed.length) {
      setMessage("No quotes found. Make sure each topic/sub-topic heading is on its own line and quotes are numbered.");
      return;
    }
    setBusy(true); setMessage("Importing...");
    const res = await insertUnique(parsed);
    if (res.error) setMessage(res.error);
    else if (!res.added) setMessage(`All ${parsed.length} quotes already exist.`);
    else {
      setBulkAll("");
      setMessage(`Imported ${res.added} quotes (${res.skipped} duplicates skipped).`);
    }
    await load();
    setBusy(false);
  };




  const remove = async (table: "tab_banners" | "quote_backgrounds" | "daily_quotes", id: string) => {
    if (!confirm("Delete this item?")) return;
    setBusy(true);
    const { error } = await supabase.from(table).delete().eq("id", id);
    if (error) setMessage(error.message);
    await load();
    setBusy(false);
  };

  const sections: { id: Section; label: string; icon: typeof ImageIcon }[] = [
    { id: "banners", label: "Tab images", icon: ImageIcon },
    { id: "backgrounds", label: "Wallpapers", icon: Upload },
    { id: "quotes", label: "Quotes", icon: QuoteIcon },
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {sections.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.id}
              onClick={() => setSection(s.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[11px] font-semibold ${
                section === s.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              <Icon size={12} /> {s.label}
            </button>
          );
        })}
      </div>

      {message && <p className="text-xs text-muted-foreground">{message}</p>}

      {section === "banners" && (
        <div className="space-y-3">
          <div className="flex gap-1.5 overflow-x-auto scrollbar-hide">
            {VIDEO_FEEDS.map((f) => (
              <button
                key={f.id}
                onClick={() => setTab(f.id)}
                className={`shrink-0 px-2.5 py-1.5 rounded-full text-[10px] font-semibold ${
                  tab === f.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          <p className="text-muted-foreground text-[11px]">
            Up to 5 images per tab. They crossfade every 5 seconds. {tabBanners.length}/5 used.
          </p>
          <div className="grid grid-cols-3 gap-2">
            {tabBanners.map((b) => (
              <div key={b.id} className="relative aspect-video rounded-lg overflow-hidden bg-secondary">
                <img src={b.image_url} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => remove("tab_banners", b.id)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 text-destructive"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            {tabBanners.length < 5 && (
              <button
                onClick={() => bannerInput.current?.click()}
                disabled={busy}
                className="aspect-video rounded-lg bg-secondary flex items-center justify-center text-muted-foreground disabled:opacity-50"
              >
                <Plus size={18} />
              </button>
            )}
          </div>
          <input ref={bannerInput} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addBanners(e.target.files); e.target.value = ""; }} />
        </div>
      )}

      {section === "backgrounds" && (
        <div className="space-y-3">
          <p className="text-muted-foreground text-[11px]">
            Wallpapers users can pick for Daily Quotes. {backgrounds.length} uploaded.
          </p>
          <button
            onClick={() => bgInput.current?.click()}
            disabled={busy}
            className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={14} /> {busy ? "Uploading..." : "Upload wallpapers"}
          </button>
          <input ref={bgInput} type="file" accept="image/*" multiple hidden
            onChange={(e) => { addBackgrounds(e.target.files); e.target.value = ""; }} />
          <div className="grid grid-cols-4 gap-2 max-h-[40vh] overflow-y-auto">
            {backgrounds.map((b) => (
              <div key={b.id} className="relative aspect-[9/16] rounded-lg overflow-hidden bg-secondary">
                <img src={b.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                <button
                  onClick={() => remove("quote_backgrounds", b.id)}
                  className="absolute top-1 right-1 bg-background/80 rounded-full p-1 text-destructive"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === "quotes" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <select
              value={qCat}
              onChange={(e) => { setQCat(e.target.value); setQSub(findCategory(e.target.value)!.subs[0].id); }}
              className="flex-1 bg-secondary text-foreground rounded-lg px-2 py-2 text-[11px] outline-none"
            >
              {QUOTE_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
            <select
              value={qSub}
              onChange={(e) => setQSub(e.target.value)}
              className="flex-1 bg-secondary text-foreground rounded-lg px-2 py-2 text-[11px] outline-none"
            >
              {(findCategory(qCat)?.subs ?? []).map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
          </div>

          <button
            onClick={() => pdfInput.current?.click()}
            disabled={busy}
            className="w-full bg-secondary text-secondary-foreground rounded-xl py-2.5 text-xs font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Upload size={14} /> {busy ? "Working..." : "Bulk import from PDF"}
          </button>
          <input ref={pdfInput} type="file" accept="application/pdf" multiple hidden
            onChange={(e) => { importPdfs(e.target.files); e.target.value = ""; }} />

          <div className="rounded-xl border border-border p-3 space-y-2">
            <p className="text-foreground text-xs font-semibold">Import all topics at once</p>
            <p className="text-muted-foreground text-[11px]">
              Paste the full list. Category and sub-topic headings on their own line (e.g. <em>Mental Health</em>, then <em>Stress</em>),
              quotes numbered below each heading. Duplicates are skipped automatically.
            </p>
            <textarea
              value={bulkAll}
              onChange={(e) => setBulkAll(e.target.value)}
              rows={7}
              placeholder={"Mental Health\nStress\n1. Stress is a sign you are growing.\n2. Put down what isn't yours to carry.\nAnxiety\n3. Your anxious thoughts are not facts."}
              className="w-full bg-secondary text-foreground rounded-xl px-3 py-2.5 text-xs placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary resize-none"
            />
            <button
              onClick={importAllTopics}
              disabled={busy || !bulkAll.trim()}
              className="w-full bg-primary text-primary-foreground rounded-xl py-2.5 text-xs font-semibold disabled:opacity-50"
            >
              {busy ? "Importing..." : "Import all categories"}
            </button>
          </div>

          <div className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-baseline justify-between">
              <p className="text-foreground text-xs font-semibold">Library</p>
              <p className="text-muted-foreground text-[11px]">{totalQuotes} quotes total</p>
            </div>
            <div className="max-h-[28vh] overflow-y-auto space-y-2">
              {QUOTE_CATEGORIES.map((c) => {
                const catTotal = c.subs.reduce((n, s) => n + (counts[`${c.id}|${s.id}`] || 0), 0);
                return (
                  <div key={c.id}>
                    <div className="flex justify-between text-[11px] text-foreground font-semibold">
                      <span>{c.label}</span>
                      <span>{catTotal}</span>
                    </div>
                    {c.subs.map((s) => (
                      <div key={s.id} className="flex justify-between text-[10px] text-muted-foreground pl-2">
                        <span>{s.label}</span>
                        <span>{counts[`${c.id}|${s.id}`] || 0}</span>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="max-h-[35vh] overflow-y-auto space-y-1.5">
            {quotes.map((q) => (
              <div key={q.id} className="flex items-start gap-2 bg-secondary rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-foreground text-xs">{q.text}</p>
                  <p className="text-muted-foreground text-[10px] mt-0.5">
                    {[findCategory(q.category)?.label, q.category && q.subcategory ? subLabel(q.category, q.subcategory) : null, q.author]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                </div>
                <button onClick={() => remove("daily_quotes", q.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default TabMediaManager;
