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
      className={`w-9 h-9 rounded-full bg-black/35 backdrop-blur-md flex items-center justify-center text-foreground active:scale-95 transition-transform duration-200 ${className}`}
    >
      {(["quick_spark", "long_game"] as HomeSection[]).map((id) => {
        const Icon = id === "quick_spark" ? Zap : Mountain;
        const shown = next === id;
        return (
          <span
            key={id}
            className="absolute inset-0 flex items-center justify-center transition-all duration-300 ease-out"
            style={{ opacity: shown ? 1 : 0, transform: `scale(${shown ? 1 : 0.7})` }}
          >
            <Icon size={18} strokeWidth={2} />
          </span>
        );
      })}
    </button>
  );
};

export default LiquidGlassToggle;
