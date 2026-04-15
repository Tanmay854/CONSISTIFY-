import { useState, useEffect } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [showText, setShowText] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowText(true), 400);
    const t2 = setTimeout(() => setShowDisclaimer(true), 1200);
    const t3 = setTimeout(() => setFadeOut(true), 3500);
    const t4 = setTimeout(() => onFinish(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Main title */}
      <h1
        className={`text-5xl md:text-7xl font-black text-white tracking-tight transition-all duration-700 ${
          showText ? "opacity-100 scale-100" : "opacity-0 scale-90"
        }`}
        style={{ fontFamily: "'Arial Black', 'Helvetica Neue', sans-serif" }}
      >
        Discipline
      </h1>

      {/* Disclaimer */}
      <p
        className={`absolute bottom-[30%] text-xs md:text-sm text-white/50 px-8 text-center transition-opacity duration-700 ${
          showDisclaimer ? "opacity-100" : "opacity-0"
        }`}
      >
        Disclaimer - this app only helps to start, not reaching your destination
      </p>
    </div>
  );
};

export default SplashScreen;
