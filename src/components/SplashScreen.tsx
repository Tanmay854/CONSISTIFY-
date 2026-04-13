import { useState, useEffect } from "react";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setFadeOut(true), 2400);
    const finishTimer = setTimeout(() => onFinish(), 2900);
    return () => {
      clearTimeout(timer);
      clearTimeout(finishTimer);
    };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-background ${
        fadeOut ? "animate-splash-fade-out" : ""
      }`}
    >
      {/* Background glow */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-[400px] h-[400px] rounded-full bg-primary/10 blur-[100px] animate-pulse-glow" />
      </div>

      {/* Logo */}
      <div className="animate-splash-logo">
        <h1 className="font-display text-6xl md:text-8xl font-bold gradient-gold tracking-tight">
          Motivation
        </h1>
      </div>

      {/* Tagline */}
      <p className="animate-splash-tagline text-muted-foreground text-lg mt-4 tracking-widest uppercase text-sm">
        Ignite Your Inner Fire
      </p>

      {/* Bottom decorative line */}
      <div className="absolute bottom-12 animate-splash-tagline">
        <div className="w-16 h-[2px] bg-primary/40 rounded-full" />
      </div>
    </div>
  );
};

export default SplashScreen;
