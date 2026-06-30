import { useState, useEffect } from "react";
import splashAsset from "@/assets/discipline-x-splash.png.asset.json";

const SplashScreen = ({ onFinish }: { onFinish: () => void }) => {
  const [showText, setShowText] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setShowText(true), 150);
    const t3 = setTimeout(() => setFadeOut(true), 3500);
    const t4 = setTimeout(() => onFinish(), 4200);
    return () => { clearTimeout(t1); clearTimeout(t3); clearTimeout(t4); };
  }, [onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-black transition-opacity duration-700 ${
        fadeOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <img
        src={splashAsset.url}
        alt="DISCIPLINE X"
        className={`absolute inset-0 h-full w-full object-cover transition-all duration-700 ${
          showText ? "opacity-100 scale-100" : "opacity-0 scale-105"
        }`}
        decoding="async"
      />
      <span className="sr-only">DISCIPLINE X</span>
    </div>
  );
};

export default SplashScreen;
