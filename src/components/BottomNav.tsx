import { House, Music, Quote, Upload } from "lucide-react";

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
    { id: "reels", label: "Videos", icon: House },
    { id: "music", label: "Music", icon: Music },
    { id: "quotes", label: "Quotes", icon: Quote },
  ];

  if (showUpload) {
    tabs.push({ id: "upload", label: "Upload", icon: Upload });
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border">
      <div className="flex items-center justify-around h-[76px] max-w-lg mx-auto px-1 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1.5 py-2 transition-colors duration-200"
              aria-label={tab.label}
            >
              <Icon
                size={30}
                className={isActive ? "text-foreground" : "text-tab-inactive"}
                strokeWidth={isActive ? 3 : 2.6}
                fill={isActive ? "currentColor" : "none"}
              />
              <span
                className={`text-[11px] font-black uppercase leading-none ${
                  isActive ? "text-foreground" : "text-tab-inactive"
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
