import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";

interface Row { date: string; admins: number; uploaders: number; }

const AnalyticsChart = () => {
  const [data, setData] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [totals, setTotals] = useState({ admins: 0, uploaders: 0 });

  useEffect(() => {
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 29);
      since.setHours(0, 0, 0, 0);

      // Roles don't carry created_at directly, join via profiles
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role, user_id");

      const userIds = (rolesData || []).map(r => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, created_at")
        .in("user_id", userIds.length ? userIds : ["00000000-0000-0000-0000-000000000000"]);

      const profMap = new Map((profs || []).map(p => [p.user_id, p.created_at]));

      // Bucket per day
      const days: Row[] = [];
      for (let i = 0; i < 30; i++) {
        const d = new Date(since);
        d.setDate(since.getDate() + i);
        days.push({ date: d.toISOString().slice(5, 10), admins: 0, uploaders: 0 });
      }

      let adminTotal = 0, upTotal = 0;
      (rolesData || []).forEach(r => {
        if (r.role === "admin") adminTotal++;
        if (r.role === "uploader") upTotal++;
        const ts = profMap.get(r.user_id);
        if (!ts) return;
        const d = new Date(ts);
        if (d < since) return;
        const key = d.toISOString().slice(5, 10);
        const row = days.find(x => x.date === key);
        if (row) {
          if (r.role === "admin") row.admins++;
          else if (r.role === "uploader") row.uploaders++;
        }
      });

      setTotals({ admins: adminTotal, uploaders: upTotal });
      setData(days);
      setLoading(false);
    })();
  }, []);

  if (loading) return <p className="text-muted-foreground text-xs text-center py-6">Loading analytics…</p>;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-secondary rounded-xl p-3">
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Admins</p>
          <p className="text-foreground text-2xl font-bold">{totals.admins}<span className="text-muted-foreground text-xs font-normal"> / 5</span></p>
        </div>
        <div className="bg-secondary rounded-xl p-3">
          <p className="text-muted-foreground text-[10px] uppercase tracking-wider">Uploaders</p>
          <p className="text-foreground text-2xl font-bold">{totals.uploaders}<span className="text-muted-foreground text-xs font-normal"> / 200</span></p>
        </div>
      </div>
      <div className="bg-secondary rounded-xl p-3">
        <p className="text-muted-foreground text-[10px] uppercase tracking-wider mb-2">New roles · last 30 days</p>
        <div style={{ width: "100%", height: 200 }}>
          <ResponsiveContainer>
            <LineChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line type="monotone" dataKey="admins" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="uploaders" stroke="hsl(var(--muted-foreground))" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsChart;
