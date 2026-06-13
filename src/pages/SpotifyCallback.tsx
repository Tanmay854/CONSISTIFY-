import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { completeSpotifyLogin } from "@/lib/spotifyConnect";

const SpotifyCallback = () => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState("Connecting your Spotify account…");

  useEffect(() => {
    (async () => {
      try {
        await completeSpotifyLogin(window.location.search);
        setMsg("Connected! Returning to the app…");
      } catch (e) {
        setMsg(e instanceof Error ? e.message : "Failed to connect Spotify");
      } finally {
        setTimeout(() => navigate("/?tab=music", { replace: true }), 600);
      }
    })();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white px-6 text-center">
      <p className="text-sm">{msg}</p>
    </div>
  );
};

export default SpotifyCallback;
