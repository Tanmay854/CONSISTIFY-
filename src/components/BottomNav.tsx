import { Compass, House, Music, Quote, Star, Upload } from "lucide-react";

type Tab = "reels" | "music" | "quotes" | "upload";

const BottomNav = ({
  activeTab,
  onTabChange,
  showUpload,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
  showUpload?: boolean;
}) => {
  const tabs: { id: Tab; label: string; icon: typeof House }[] = [
    { id: "reels", label: "Home", icon: House },
    { id: "reels", label: "Discover", icon: Compass },
    { id: "music", label: "Music", icon: Music },
    { id: "quotes", label: "Quotes", icon: Quote },
    { id: "quotes", label: "Favorites", icon: Star },
  ];

  if (showUpload) {
    tabs.push({ id: "upload", label: "Upload", icon: Upload });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-white/5 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-around h-[78px] max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-2 py-2 transition-colors duration-200"
              aria-label={tab.label}
            >
              <Icon
                size={tab.label === "Music" ? 31 : 30}
                className={isActive ? "text-white" : "text-white/45"}
                strokeWidth={isActive ? 3.2 : 3}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={`text-[11px] font-black uppercase tracking-wide leading-none ${
                  isActive ? "text-white" : "text-white/45"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
