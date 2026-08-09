import { Mountain, Zap } from "lucide-react";

export type HomeSection = "long_game" | "quick_spark";

/**
 * Floating "liquid glass" circular button that shows the icon of the section
 * the user is NOT currently in. Tapping it switches sections.
 */
const LiquidGlassToggle = ({
  active,
  onToggle,
  className = "",
  style,
}: {
  active: HomeSection;
  onToggle: (next: HomeSection) => void;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const next: HomeSection = active === "long_game" ? "quick_spark" : "long_game";
  const label = next === "quick_spark" ? "Switch to Quick Clips" : "Switch to Long Game";

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onToggle(next)}
      style={style}
      className={`w-9 h-9 rounded-full overflow-hidden backdrop-blur-xl bg-gradient-to-br from-[hsl(var(--foreground)/0.25)] to-[hsl(var(--foreground)/0.08)] ring-1 ring-foreground/20 shadow-[0_8px_24px_rgba(0,0,0,0.45)] flex items-center justify-center text-foreground active:scale-95 transition-transform duration-200 ${className}`}
    >
      {/* specular highlight */}
      <span className="pointer-events-none absolute -top-2 -left-2 w-8 h-8 rounded-full bg-[hsl(var(--foreground)/0.28)] blur-md" />
      {/* small glint */}
      <span className="pointer-events-none absolute top-1.5 left-3 w-1 h-1 rounded-full bg-[hsl(var(--foreground)/0.9)]" />

      {(["quick_spark", "long_game"] as HomeSection[]).map((id) => {
        const Icon = id === "quick_spark" ? Zap : Mountain;
        const shown = next === id;
        return (
          <span
            key={id}
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out"
            style={{ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 0.7})` }}
          >
            <Icon size={17} strokeWidth={2.2} />
          </span>
        );
      })}
    </button>
  );
};

export default LiquidGlassToggle;
