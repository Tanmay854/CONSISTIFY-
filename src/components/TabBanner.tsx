import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Banner {
  id: string;
  image_url: string;
}

const cache = new Map<string, Banner[]>();

/**
 * Rotating hero strip. Up to 5 admin-managed images per tab, crossfading
 * every 5 seconds.
 */
const TabBanner = ({ tab, className = "" }: { tab: string; className?: string }) => {
  const [banners, setBanners] = useState<Banner[]>(() => cache.get(tab) ?? []);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("tab_banners")
      .select("id,image_url")
      .eq("tab", tab)
      .order("position", { ascending: true })
      .limit(5)
      .then(({ data }) => {
        if (cancelled || !data) return;
        cache.set(tab, data as Banner[]);
        setBanners(data as Banner[]);
      });
    return () => { cancelled = true; };
  }, [tab]);

  useEffect(() => {
    if (banners.length < 2) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % banners.length);
    }, 5000);
    return () => window.clearInterval(t);
  }, [banners.length]);

  if (banners.length === 0) return null;

  return (
    <div className={`relative w-full aspect-[16/9] overflow-hidden rounded-2xl bg-secondary ${className}`}>
      {banners.map((b, i) => (
        <img
          key={b.id}
          src={b.image_url}
          alt=""
          loading={i === 0 ? "eager" : "lazy"}
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[900ms] ease-out will-change-[opacity]"
          style={{ opacity: i === index ? 1 : 0 }}
        />
      ))}
      <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent pointer-events-none" />
      {banners.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
          {banners.map((b, i) => (
            <span
              key={b.id}
              className={`h-1 rounded-full transition-all duration-500 ${i === index ? "w-4 bg-foreground" : "w-1 bg-foreground/40"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TabBanner;
