import { useEffect } from "react";
import { ChevronLeft, Star, Clock, PlayCircle, Award } from "lucide-react";
import type { Course } from "@/lib/courseCategories";

const CourseDetailSheet = ({
  course,
  onClose,
  allCourses,
  onSelect,
}: {
  course: Course;
  onClose: () => void;
  allCourses: Course[];
  onSelect: (c: Course) => void;
}) => {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const related = allCourses
    .filter((c) => c.id !== course.id && c.category === course.category)
    .slice(0, 10);

  const bullets = (text: string | null | undefined) =>
    (text || "")
      .split("\n")
      .map((l) => l.replace(/^[-•\d.)\s]+/, "").trim())
      .filter(Boolean);

  const learn = bullets(course.what_youll_learn);
  const curr = bullets(course.curriculum);
  const reqs = bullets(course.requirements);

  return (
    <div className="fixed inset-0 z-[70] bg-black text-white overflow-y-auto animate-fade-in">
      {/* Hero */}
      <div className="relative h-[62vh] w-full">
        <img
          src={course.hero_image || course.cover_image}
          alt={course.title}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20" />
        <button
          onClick={onClose}
          aria-label="Back"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 flex items-center justify-center"
        >
          <ChevronLeft size={20} className="text-white" />
        </button>
        <div className="absolute inset-x-0 bottom-0 p-6 pb-7">
          <p className="text-white/60 text-[11px] uppercase tracking-[0.2em] font-semibold">{course.category}</p>
          <h1 className="mt-2 text-white text-3xl font-bold leading-tight tracking-tight">{course.title}</h1>
          {course.subtitle && <p className="text-white/70 text-sm mt-1.5">{course.subtitle}</p>}
          <p className="text-white/50 text-xs mt-2">{course.instructor}</p>
          <div className="flex items-center gap-4 text-white/70 text-xs mt-3">
            {course.rating ? (
              <span className="flex items-center gap-1"><Star size={12} fill="currentColor" className="text-yellow-400" />{course.rating}</span>
            ) : null}
            {course.duration && <span className="flex items-center gap-1"><Clock size={12} />{course.duration}</span>}
            {course.lessons_count ? (
              <span className="flex items-center gap-1"><PlayCircle size={12} />{course.lessons_count} lessons</span>
            ) : null}
            {course.level && (
              <span className="flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-0.5 rounded-full border border-white/10">
                <Award size={11} />{course.level}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="px-6 py-6 space-y-8 pb-32">
        {course.description && (
          <section>
            <h2 className="text-white text-base font-semibold mb-2 tracking-tight">About this course</h2>
            <p className="text-white/70 text-[14px] leading-relaxed whitespace-pre-line">{course.description}</p>
          </section>
        )}

        {learn.length > 0 && (
          <section>
            <h2 className="text-white text-base font-semibold mb-3 tracking-tight">What you'll learn</h2>
            <div className="grid grid-cols-1 gap-2">
              {learn.map((l, i) => (
                <div key={i} className="flex items-start gap-3 bg-white/[0.04] border border-white/5 rounded-2xl p-3.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-white/60 mt-2 shrink-0" />
                  <p className="text-white/85 text-[14px] leading-snug">{l}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {curr.length > 0 && (
          <section>
            <h2 className="text-white text-base font-semibold mb-3 tracking-tight">Curriculum</h2>
            <ol className="space-y-2">
              {curr.map((l, i) => (
                <li key={i} className="flex items-center gap-3 bg-white/[0.04] border border-white/5 rounded-2xl px-4 py-3">
                  <span className="text-white/40 text-xs font-mono w-6 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                  <p className="text-white/85 text-[14px]">{l}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        {reqs.length > 0 && (
          <section>
            <h2 className="text-white text-base font-semibold mb-3 tracking-tight">Requirements</h2>
            <ul className="space-y-1.5">
              {reqs.map((l, i) => (
                <li key={i} className="text-white/70 text-[13px] flex items-start gap-2">
                  <span className="text-white/40 mt-0.5">—</span>{l}
                </li>
              ))}
            </ul>
          </section>
        )}

        {related.length > 0 && (
          <section>
            <h2 className="text-white text-base font-semibold mb-3 tracking-tight px-0">Related courses</h2>
            <div className="-mx-6 px-6 flex gap-3 overflow-x-auto no-scrollbar">
              {related.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelect(c)}
                  className="shrink-0 w-56 text-left active:scale-[0.97] transition-transform"
                >
                  <div className="aspect-video rounded-2xl overflow-hidden bg-neutral-900">
                    <img src={c.cover_image} alt={c.title} loading="lazy" className="w-full h-full object-cover" />
                  </div>
                  <p className="text-white text-sm font-semibold mt-2 line-clamp-1">{c.title}</p>
                  <p className="text-white/50 text-xs">{c.instructor}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Sticky Buy button */}
      <div className="fixed bottom-0 inset-x-0 z-[71] p-4 pb-6 bg-gradient-to-t from-black via-black/90 to-transparent">
        <a
          href={course.affiliate_link}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center w-full h-14 rounded-2xl bg-white text-black font-semibold text-[15px] tracking-tight active:scale-[0.98] transition-transform shadow-[0_10px_40px_-10px_rgba(255,255,255,0.4)]"
        >
          Buy course
        </a>
      </div>
    </div>
  );
};

export default CourseDetailSheet;
