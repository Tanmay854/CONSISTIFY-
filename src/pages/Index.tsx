import { useState, useCallback } from "react";
import SplashScreen from "@/components/SplashScreen";
import BottomNav from "@/components/BottomNav";
import ReelsTab from "@/components/ReelsTab";
import MusicTab from "@/components/MusicTab";
import QuotesTab from "@/components/QuotesTab";

type Tab = "reels" | "music" | "quotes";

const Index = () => {
  const [showSplash, setShowSplash] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>("reels");

  const handleSplashFinish = useCallback(() => {
    setShowSplash(false);
  }, []);

  if (showSplash) {
    return <SplashScreen onFinish={handleSplashFinish} />;
  }

  return (
    <div className="min-h-screen bg-background">
      {activeTab === "reels" && <ReelsTab />}
      {activeTab === "music" && <MusicTab />}
      {activeTab === "quotes" && <QuotesTab />}
      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
