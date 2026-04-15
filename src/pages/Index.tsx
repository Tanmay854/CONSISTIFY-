import { useState, useCallback } from "react";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import ReelsTab from "@/components/ReelsTab";
import MusicTab from "@/components/MusicTab";
import QuotesTab from "@/components/QuotesTab";
import UploadTab from "@/components/UploadTab";
import SettingsDrawer from "@/components/SettingsDrawer";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { Settings } from "lucide-react";

type Tab = "reels" | "music" | "quotes" | "upload";

const AppContent = () => {
  const { canUpload } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("reels");
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Global settings icon */}
      <button
        onClick={() => setShowSettings(true)}
        className="fixed top-4 right-4 z-30 w-9 h-9 rounded-full bg-secondary/80 backdrop-blur-sm flex items-center justify-center"
      >
        <Settings size={18} className="text-foreground" />
      </button>

      {activeTab === "reels" && <ReelsTab />}
      {activeTab === "music" && <MusicTab />}
      {activeTab === "quotes" && <QuotesTab />}
      {activeTab === "upload" && <UploadTab />}

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} showUpload={canUpload} />
      <SettingsDrawer open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default Index;
