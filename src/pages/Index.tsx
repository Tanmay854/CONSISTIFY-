import { useState, useCallback, useEffect } from "react";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import ReelsTab from "@/components/ReelsTab";
import MusicTab from "@/components/MusicTab";
import QuotesTab from "@/components/QuotesTab";
import UploadTab from "@/components/UploadTab";
import SettingsDrawer from "@/components/SettingsDrawer";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { MoreVertical, Volume2, VolumeX } from "lucide-react";

type Tab = "reels" | "music" | "quotes" | "upload";

const AppContent = () => {
  const { canUpload } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tab = new URLSearchParams(window.location.search).get("tab");
    return tab === "music" || tab === "quotes" || tab === "upload" ? tab : "reels";
  });
  const [showSettings, setShowSettings] = useState(false);
  const [muted, setMuted] = useState<boolean>(() => {
    // Default to muted so browsers allow autoplay. User can unmute via the button.
    try {
      const v = localStorage.getItem("video_muted");
      return v === null ? true : v === "1";
    } catch { return true; }
  });

  useEffect(() => {
    try { localStorage.setItem("video_muted", muted ? "1" : "0"); } catch { /* empty */ }
    document.querySelectorAll("video").forEach((v) => { (v as HTMLVideoElement).muted = muted; });
  }, [muted]);

  return (
    <div className="min-h-screen bg-background">
      <button
        onClick={() => setShowSettings(true)}
        aria-label="Open settings"
        className="fixed top-4 left-4 z-30 w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
      >
        <MoreVertical size={21} className="text-foreground" strokeWidth={2.8} />
      </button>

      {activeTab === "reels" && (
        <button
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute video" : "Mute video"}
          className="fixed bottom-20 left-4 z-30 w-9 h-9 rounded-full bg-secondary/80 flex items-center justify-center"
        >
          {muted ? <VolumeX size={18} className="text-foreground" /> : <Volume2 size={18} className="text-foreground" />}
        </button>
      )}

      {activeTab === "reels" && <ReelsTab muted={muted} />}
      {activeTab === "music" && <MusicTab />}
      {activeTab === "quotes" && <QuotesTab />}
      {activeTab === "upload" && <UploadTab />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
      <SettingsDrawer
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onOpenUpload={canUpload ? () => { setActiveTab("upload"); setShowSettings(false); } : undefined}
      />
    </div>
  );
};

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => { setShowSplash(false); }, []);
  if (showSplash) return <SplashScreen onFinish={handleSplashFinish} />;
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
