import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { QUOTE_FONTS, QuoteFont } from "@/lib/quoteFonts";

interface Props {
  open: boolean;
  value: string;
  onSelect: (id: string) => void;
  scale: number;
  onScale: (v: number) => void;
  onClose: () => void;
}

/**
 * Compact iOS-style font panel that expands upward from the actions arrow.
 */
const FontPicker = ({ open, value, onSelect, scale, onScale, onClose }: Props) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener("pointerdown", onDown);
    return () => window.removeEventListener("pointerdown", onDown);
  }, [open, onClose]);

  return (
    <div
      ref={ref}
      role="listbox"
      aria-label="Quote font"
      className="absolute bottom-11 right-0 w-56 origin-bottom-right rounded-2xl bg-black/55 backdrop-blur-xl border border-white/10 shadow-2xl overflow-hidden transition-all duration-[260ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
      style={{
        opacity: open ? 1 : 0,
        transform: open ? "translateY(0) scale(1)" : "translateY(12px) scale(0.94)",
        pointerEvents: open ? "auto" : "none",
      }}
    >
      <p className="px-3.5 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">
        Font
      </p>
      <div className="max-h-[46vh] overflow-y-auto scrollbar-hide pb-2">
        {QUOTE_FONTS.map((f: QuoteFont) => (
          <button
            key={f.id}
            role="option"
            aria-selected={f.id === value}
            aria-label={f.label}
            onClick={() => { onSelect(f.id); onClose(); }}
            className="w-full flex items-center gap-3 px-3.5 py-2 text-left active:bg-white/10"
          >
            <span
              className="w-7 shrink-0 text-[17px] leading-none text-white"
              style={{ fontFamily: f.stack, fontWeight: f.weight }}
            >
              Aa
            </span>
            <span
              className="flex-1 text-[13px] text-white/90 truncate"
              style={{ fontFamily: f.stack, fontWeight: f.decorative ? 400 : 500 }}
            >
              {f.label}
            </span>
            {f.id === value && <Check size={14} className="text-white shrink-0" />}
          </button>
        ))}
      </div>

      {/* Font size */}
      <div className="border-t border-white/10 px-3.5 pt-2.5 pb-3">
        <p className="pb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/50">Size</p>
        <div className="flex items-center gap-2.5">
          <span className="text-white/70 text-[12px] leading-none">A</span>
          <input
            type="range"
            min={0.7}
            max={1.3}
            step={0.05}
            value={scale}
            aria-label="Font size"
            onChange={(e) => onScale(Number(e.target.value))}
            className="flex-1 h-1 appearance-none rounded-full bg-white/25 accent-white"
          />
          <span className="text-white/85 text-[18px] leading-none">A</span>
        </div>
      </div>
    </div>
  );
};

export default FontPicker;
