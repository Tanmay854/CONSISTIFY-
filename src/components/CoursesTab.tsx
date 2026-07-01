import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { COURSE_CATEGORIES, type Course } from "@/lib/courseCategories";
import { Search, Star, Clock, Play, X } from "lucide-react";
import CourseDetailSheet from "./CourseDetailSheet";
import HlsVideo from "./HlsVideo";

const LEVEL_FILTERS = ["Beginner", "Intermediate", "Advanced"] as const;
const PRICE_FILTERS = ["Free", "Paid"] as const;

const CoursesTab = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Course | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [showSearch, setShowSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [priceFilter, setPriceFilter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("courses" as never)
        .select("*")
        .eq("published", true)
        .order("created_at", { ascending: false });
      setCourses(((data as unknown) as Course[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(() => courses.filter((c) => c.featured), [courses]);
  const trending = useMemo(() => courses.filter((c) => c.trending), [courses]);
  const newReleases = useMemo(() => courses.filter((c) => c.is_new_release), [courses]);
  const bestSellers = useMemo(() => courses.filter((c) => c.is_best_seller), [courses]);

  // Rotate hero every 6s
  useEffect(() => {
    if (featured.length < 2) return;
    const t = setInterval(() => setHeroIndex((i) => (i + 1) % featured.length), 6000);
    return () => clearInterval(t);
  }, [featured.length]);

  const hero = featured[heroIndex] ?? courses[0];

  const searchResults = useMemo(() => {
    if (!showSearch) return [];
    const q = query.trim().toLowerCase();
    return courses.filter((c) => {
      if (levelFilter && (c.level || "").toLowerCase() !== levelFilter.toLowerCase()) return false;
      if (priceFilter === "Free" && (c as unknown as { price?: number }).price && (c as unknown as { price?: number }).price! > 0) return false;
      if (!q) return true;
      return (
        c.title.toLowerCase().includes(q) ||
        c.instructor.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [courses, query, levelFilter, priceFilter, showSearch]);

  if (loading) {
    return (
      <div className="min-h-[100dvh] bg-black">
        <div className="h-[62vh] bg-neutral-900/50 animate-pulse" />
        <div className="p-4 space-y-6">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-3">
              <div className="h-4 w-40 bg-neutral-900 rounded animate-pulse" />
              <div className="flex gap-3 overflow-hidden">
                {[0, 1, 2].map((j) => (
                  <div key={j} className="w-64 aspect-video rounded-2xl bg-neutral-900 animate-pulse shrink-0" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (showSearch) {
    return (
      <div className="fixed inset-0 z-40 bg-black overflow-y-auto">
        <div className="sticky top-0 z-10 bg-black/85 backdrop-blur-xl px-4 pt-4 pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <button onClick={() => { setShowSearch(false); setQuery(""); }} className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
              <X size={18} className="text-white" />
            </button>
            <div className="flex-1 flex items-center gap-2 bg-white/10 rounded-full px-4 h-10">
              <Search size={16} className="text-white/70" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search courses, instructors…"
                className="flex-1 bg-transparent text-white text-sm outline-none placeholder:text-white/40"
              />
            </div>
          </div>
          <div className="mt-3 flex gap-2 overflow-x-auto no-scrollbar">
            {LEVEL_FILTERS.map((l) => (
              <FilterChip key={l} active={levelFilter === l} onClick={() => setLevelFilter(levelFilter === l ? null : l)}>{l}</FilterChip>
            ))}
            <div className="w-px bg-white/10" />
            {PRICE_FILTERS.map((p) => (
              <FilterChip key={p} active={priceFilter === p} onClick={() => setPriceFilter(priceFilter === p ? null : p)}>{p}</FilterChip>
            ))}
          </div>
        </div>
        <div className="p-4 pb-24 grid grid-cols-2 gap-3">
          {searchResults.map((c) => (
            <button key={c.id} onClick={() => setSelected(c)} className="text-left">
              <div className="aspect-video rounded-xl overflow-hidden bg-neutral-900">
                <img src={c.cover_image} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
              </div>
              <p className="text-white text-[13px] font-medium mt-2 line-clamp-2">{c.title}</p>
              <p className="text-white/50 text-[11px]">{c.instructor}</p>
            </button>
          ))}
          {searchResults.length === 0 && (
            <p className="col-span-2 text-center text-white/50 text-sm mt-16">No matches.</p>
          )}
        </div>
        {selected && <CourseDetailSheet course={selected} onClose={() => setSelected(null)} allCourses={courses} onSelect={setSelected} />}
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-24">
      {/* Hero */}
      {hero && (
        <div className="relative h-[68vh] w-full overflow-hidden">
          {hero.hero_video_url ? (
            <video
              key={hero.id}
              src={hero.hero_video_url}
              poster={hero.hero_image || hero.cover_image}
              autoPlay
              muted
              loop
              playsInline
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            />
          ) : (
            <img
              key={hero.id}
              src={hero.hero_image || hero.cover_image}
              alt={hero.title}
              className="absolute inset-0 w-full h-full object-cover animate-fade-in"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/10" />
          <div className="absolute inset-x-0 top-4 flex justify-end px-4">
            <button
              onClick={() => setShowSearch(true)}
              aria-label="Search courses"
              className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-xl flex items-center justify-center border border-white/10"
            >
              <Search size={18} className="text-white" />
            </button>
          </div>
          <div className="absolute inset-x-0 bottom-0 p-6 pb-8">
            <span className="inline-block text-[10px] tracking-[0.2em] font-semibold uppercase text-white/80 bg-white/10 backdrop-blur px-2.5 py-1 rounded-full border border-white/15">
              Featured
            </span>
            <h1 className="mt-3 text-white text-3xl font-bold leading-tight tracking-tight">{hero.title}</h1>
            {hero.subtitle && <p className="text-white/70 text-sm mt-1.5 line-clamp-2">{hero.subtitle}</p>}
            <p className="text-white/50 text-xs mt-2">{hero.instructor}</p>
            <div className="flex items-center gap-3 mt-5">
              <button
                onClick={() => setSelected(hero)}
                className="flex items-center gap-2 bg-white text-black rounded-full px-6 h-11 font-semibold text-sm active:scale-95 transition-transform"
              >
                <Play size={16} fill="currentColor" /> View course
              </button>
              <a
                href={hero.affiliate_link}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-xl border border-white/15 rounded-full px-5 h-11 font-semibold text-sm text-white active:scale-95 transition-transform"
              >
                Buy course
              </a>
            </div>
          </div>
          {featured.length > 1 && (
            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
              {featured.map((_, i) => (
                <span key={i} className={`h-1 rounded-full transition-all ${i === heroIndex ? "w-6 bg-white" : "w-1.5 bg-white/30"}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Rows */}
      <div className="mt-6 space-y-8">
        <Row title="Trending Now" items={trending} onSelect={setSelected} />
        <Row title="New Releases" items={newReleases} onSelect={setSelected} />
        <Row title="Best Sellers" items={bestSellers} onSelect={setSelected} />
        {COURSE_CATEGORIES.map((cat) => {
          const items = courses.filter((c) => c.category === cat);
          if (items.length === 0) return null;
          return <Row key={cat} title={cat} items={items} onSelect={setSelected} />;
        })}
      </div>

      {courses.length === 0 && (
        <div className="text-center text-white/50 text-sm mt-24 px-8">
          No courses yet. Check back soon.
        </div>
      )}

      {selected && <CourseDetailSheet course={selected} onClose={() => setSelected(null)} allCourses={courses} onSelect={setSelected} />}
    </div>
  );
};

const Row = ({ title, items, onSelect }: { title: string; items: Course[]; onSelect: (c: Course) => void }) => {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className="text-white text-lg font-semibold px-5 mb-3 tracking-tight">{title}</h2>
      <div className="flex gap-3 overflow-x-auto no-scrollbar px-5 snap-x snap-mandatory">
        {items.map((c) => (
          <button
            key={c.id}
            onClick={() => onSelect(c)}
            className="snap-start shrink-0 w-64 group text-left active:scale-[0.97] transition-transform duration-200"
          >
            <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.9)]">
              <img
                src={c.cover_image}
                alt={c.title}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
              />
            </div>
            <p className="text-white text-sm font-semibold mt-2.5 line-clamp-1 tracking-tight">{c.title}</p>
            <p className="text-white/50 text-xs line-clamp-1">{c.instructor}</p>
            <div className="flex items-center gap-3 text-white/50 text-[11px] mt-1">
              {c.duration && (
                <span className="flex items-center gap-1"><Clock size={10} />{c.duration}</span>
              )}
              {c.rating ? (
                <span className="flex items-center gap-1"><Star size={10} fill="currentColor" className="text-yellow-400" />{c.rating}</span>
              ) : null}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
};

const FilterChip = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`shrink-0 px-4 h-8 rounded-full text-xs font-medium transition-colors ${
      active ? "bg-white text-black" : "bg-white/10 text-white/80 border border-white/10"
    }`}
  >
    {children}
  </button>
);

export default CoursesTab;
