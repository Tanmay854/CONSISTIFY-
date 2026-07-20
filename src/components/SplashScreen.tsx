import { useEffect, useRef, useState } from "react";
import "./splash.css";

const WORD = "CONSISTIFY";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const arcRef = useRef<SVGPathElement | null>(null);
  const markWrapRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [fadeOut, setFadeOut] = useState(false);
  const finishedRef = useRef(false);

  useEffect(() => {
    const arcPath = arcRef.current;
    const markWrap = markWrapRef.current;
    const stage = stageRef.current;
    if (!arcPath || !markWrap || !stage) return;

    // Build the C-shaped arc path
    const cx = 120, cy = 120, r = 88;
    const gapDeg = 64;
    const startDeg = gapDeg / 2;
    const endDeg = 360 - gapDeg / 2;
    const toRad = (d: number) => (d * Math.PI) / 180;
    const startX = cx + r * Math.cos(toRad(startDeg));
    const startY = cy + r * Math.sin(toRad(startDeg));
    const endX = cx + r * Math.cos(toRad(endDeg));
    const endY = cy + r * Math.sin(toRad(endDeg));

    arcPath.setAttribute("d", `M ${startX} ${startY} A ${r} ${r} 0 1 1 ${endX} ${endY}`);

    const len = arcPath.getTotalLength();
    const segment = len * 0.2;

    arcPath.style.strokeDasharray = `${segment} ${len - segment}`;
    arcPath.style.strokeDashoffset = "0";

    const timeouts: number[] = [];

    const spin = arcPath.animate(
      [{ strokeDashoffset: 0 }, { strokeDashoffset: -len }],
      { duration: 650, iterations: 2, easing: "linear", fill: "forwards" }
    );

    spin.onfinish = () => {
      spin.cancel();
      arcPath.style.strokeDashoffset = "0";

      const grow = arcPath.animate(
        [
          { strokeDasharray: `${segment} ${len - segment}` },
          { strokeDasharray: `${len} ${len}` },
        ],
        { duration: 480, easing: "cubic-bezier(.3,.6,.3,1)", fill: "forwards" }
      );

      grow.onfinish = () => {
        try { grow.commitStyles(); } catch { /* empty */ }
        grow.cancel();
        arcPath.style.strokeDasharray = `${len} ${len}`;
        arcPath.style.strokeDashoffset = "0";

        markWrap.animate(
          [
            { transform: "scale(1)", filter: "drop-shadow(0 0 0px rgba(255,255,255,0))" },
            { transform: "scale(1.07)", filter: "drop-shadow(0 0 18px rgba(255,255,255,0.7))" },
            { transform: "scale(1)", filter: "drop-shadow(0 0 0px rgba(255,255,255,0))" },
          ],
          { duration: 480, easing: "ease-out" }
        );

        stage.classList.add("ready");

        // Trigger fade-out after wordmark + tagline settle
        const t1 = window.setTimeout(() => setFadeOut(true), 2000);
        const t2 = window.setTimeout(() => {
          if (!finishedRef.current) {
            finishedRef.current = true;
            onFinish();
          }
        }, 2700);
        timeouts.push(t1, t2);
      };
    };

    // Safety fallback so we never wedge the app on this screen
    const safety = window.setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true;
        setFadeOut(true);
        onFinish();
      }
    }, 6000);
    timeouts.push(safety);

    return () => {
      timeouts.forEach((t) => window.clearTimeout(t));
    };
  }, [onFinish]);

  const dotDelay = (WORD.length - 1) * 0.045 + 0.1;

  return (
    <div
      className={`splash-root ${fadeOut ? "splash-fade" : ""}`}
      aria-label="Consistify loading"
      role="img"
    >
      <div className="stage" ref={stageRef}>
        <div className="center-group">
          <div className="mark-wrap" ref={markWrapRef}>
            <svg viewBox="0 0 240 240" aria-hidden="true">
              <g className="glow-loop">
                <path ref={arcRef} className="ring" d="M 194.63 166.6 A 88 88 0 1 1 194.63 73.4" />
              </g>
              <circle className="center-dot" cx="120" cy="120" r="9" fill="#FFFFFF" />
            </svg>
          </div>

          <div className="wordmark" aria-label={WORD}>
            {[...WORD].map((ch, i) => {
              const isI = ch.toLowerCase() === "i";
              return (
                <span
                  key={i}
                  className={`letter${isI ? " i-letter" : ""}`}
                  style={{ ["--i" as unknown as string]: i } as React.CSSProperties}
                >
                  {isI ? (
                    <span className="i-stem">
                      <span className="i-dot" style={{ animationDelay: `${dotDelay}s` }} />
                      ı
                    </span>
                  ) : (
                    ch
                  )}
                </span>
              );
            })}
          </div>
          <div className="tagline">get inspired, get motivated</div>
        </div>

        <div className="loading" aria-hidden="true">
          <span /><span /><span />
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
