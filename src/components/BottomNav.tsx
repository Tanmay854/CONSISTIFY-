import { Film, Music, Quote } from "lucide-react";

type Tab = "reels" | "music" | "quotes";

const BottomNav = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) => {
  const tabs: { id: Tab; label: string; icon: typeof Film }[] = [
    { id: "reels", label: "Videos", icon: Film },
    { id: "music", label: "Music", icon: Music },
    { id: "quotes", label: "Quotes", icon: Quote },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-background/90 backdrop-blur-xl border-t border-border">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="flex flex-col items-center gap-1 px-6 py-2 transition-all duration-200"
            >
              <Icon
                size={22}
                className={isActive ? "text-tab-active" : "text-tab-inactive"}
                strokeWidth={isActive ? 2.5 : 1.5}
              />
              <span
                className={`text-[10px] font-medium tracking-wide uppercase ${
                  isActive ? "text-tab-active" : "text-tab-inactive"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 w-8 h-[2px] bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
