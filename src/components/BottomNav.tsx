import { House, Music2, Quote, Upload } from "lucide-react";

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
    { id: "music", label: "Music", icon: Music2 },
    { id: "quotes", label: "Quotes", icon: Quote },
  ];

  if (showUpload) {
    tabs.push({ id: "upload", label: "Upload", icon: Upload });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-white/5 shadow-[0_-8px_24px_rgba(0,0,0,0.45)]">
      <div className="flex items-center justify-around h-[58px] max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors duration-200"
              aria-label={tab.label}
            >
              <Icon
                size={24}
                className={isActive ? "text-white" : "text-white/45"}
                strokeWidth={tab.id === "reels" ? (isActive ? 2.6 : 2.2) : 1.5}
                fill={tab.id === "reels" ? (isActive ? "currentColor" : "none") : "currentColor"}
              />
              <span
                className={`text-[10px] font-bold uppercase tracking-wide leading-none ${
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
