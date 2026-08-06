type Tab = "reels" | "books" | "music" | "quotes" | "courses";

const ICONS: Record<Tab, { viewBox: string; path: string }> = {
  reels:   { viewBox: "0 0 24 24", path: "M12 3.2 2.4 11.1a1 1 0 0 0 .64 1.77H4.6v7.03a1.1 1.1 0 0 0 1.1 1.1h3.7v-5.4a2.6 2.6 0 0 1 5.2 0V21h3.7a1.1 1.1 0 0 0 1.1-1.1v-7.03h1.56a1 1 0 0 0 .64-1.77L12 3.2z" },
  books:   { viewBox: "0 0 24 24", path: "M12 6.5c-1.74-1.36-4.02-2-6.5-2-1.44 0-2.83.22-4 .68v13.32c1.17-.46 2.56-.68 4-.68 2.15 0 4.29.5 6 1.5V6.5zm0 0c1.74-1.36 4.02-2 6.5-2 1.44 0 2.83.22 4 .68v13.32c-1.17-.46-2.56-.68-4-.68-2.15 0-4.29.5-6 1.5V6.5z" },
  music:   { viewBox: "0 0 28 24", path: "M8 3v11.55A4 4 0 1 0 10 18V8.1l10-2v6.45A4 4 0 1 0 22 16V1l-14 2.8V3z" },
  quotes:  { viewBox: "0 0 24 24", path: "M9.983 3v7.391c0 5.704-3.731 9.57-8.983 10.609l-.995-2.151c2.432-.917 3.995-3.638 3.995-5.849h-4v-10h9.983zm14.017 0v7.391c0 5.704-3.748 9.571-9 10.609l-.996-2.151c2.433-.917 3.996-3.638 3.996-5.849h-3.983v-10h9.983z" },
  courses: { viewBox: "0 0 24 24", path: "M12 3L1 9l11 6 9-4.91V17h2V9L12 3zM5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82z" },
};

const TABS: { id: Tab; label: string }[] = [
  { id: "reels",   label: "HOME" },

  { id: "books",   label: "BOOKS" },
  { id: "music",   label: "MUSIC" },
  { id: "quotes",  label: "QUOTES" },
  { id: "courses", label: "COURSES" },
];

const BottomNav = ({
  activeTab,
  onTabChange,
}: {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}) => {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(20px) saturate(140%)",
        WebkitBackdropFilter: "blur(20px) saturate(140%)",
        boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
      }}
    >
      <div
        className="flex items-end justify-around gap-2 px-3 pt-1.5 pb-1 max-w-lg mx-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 4px)" }}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const icon = ICONS[tab.id];
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="relative flex flex-1 min-w-0 flex-col items-center gap-1 transition-transform duration-200"
              aria-label={tab.label}
            >
              <div
                className="flex items-center justify-center w-9 h-9 rounded-2xl transition-all duration-200"
                style={
                  isActive
                    ? {
                        background:
                          "radial-gradient(circle, rgba(255,255,255,0.09), rgba(255,255,255,0) 70%)",
                        boxShadow: "0 0 22px rgba(255,255,255,0.08)",
                      }
                    : undefined
                }
              >
                <svg
                  viewBox={icon.viewBox}
                  width={24}
                  height={24}
                  style={{
                    fill: isActive ? "#ffffff" : "#6f6f6f",
                    filter: isActive
                      ? "drop-shadow(0 0 8px rgba(255,255,255,0.35))"
                      : "drop-shadow(0 1px 1px rgba(0,0,0,0.4))",
                    transition: "fill 0.25s ease",
                  }}
                >
                  <path d={icon.path} />
                </svg>
              </div>
              <div
                className="font-extrabold leading-none"
                style={{
                  fontSize: "10px",
                  letterSpacing: "1.4px",
                  color: isActive ? "#ffffff" : "#6f6f6f",
                }}
              >
                {tab.label}
              </div>
              <div
                className="rounded-full"
                style={{
                  width: 3,
                  height: 3,
                  background: "#ffffff",
                  opacity: isActive ? 1 : 0,
                  boxShadow: "0 0 6px rgba(255,255,255,0.8)",
                  transition: "opacity 0.25s ease",
                }}
              />
            </button>
          );
        })}
        </div>
    </nav>
  );
};

export default BottomNav;
