import { useEffect, useState } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  contentType: "reel" | "music" | "quote";
  contentId: string;
  label?: string;
}

const DAYS = 14;

const StatsChart = ({ contentType, contentId, label }: Props) => {
  const [data, setData] = useState<{ day: string; count: number }[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      const since = new Date();
      since.setDate(since.getDate() - (DAYS - 1));
      since.setHours(0, 0, 0, 0);
      const { data: rows } = await supabase
        .from("content_views")
        .select("created_at")
        .eq("content_type", contentType)
        .eq("content_id", contentId)
        .gte("created_at", since.toISOString());
      if (!alive) return;
      const buckets: Record<string, number> = {};
      for (let i = 0; i < DAYS; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        const key = d.toISOString().slice(5, 10);
        buckets[key] = 0;
      }
      (rows || []).forEach((r) => {
        const key = new Date(r.created_at).toISOString().slice(5, 10);
        if (key in buckets) buckets[key]++;
      });
      setData(Object.entries(buckets).map(([day, count]) => ({ day, count })));
      setTotal((rows || []).length);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [contentType, contentId]);

  return (
    <div className="mt-3 bg-background rounded-lg p-3">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs uppercase tracking-wider text-muted-foreground">
          {label || (contentType === "music" ? "Listens" : "Views")} · last {DAYS} days
        </p>
        <p className="text-foreground text-sm font-semibold">{total}</p>
      </div>
      <div className="h-28">
        {loading ? (
          <div className="h-full bg-secondary/40 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id={`g-${contentId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} interval="preserveStartEnd" />
              <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} width={28} />
              <Tooltip
                contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              />
              <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} fill={`url(#g-${contentId})`} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default StatsChart;
