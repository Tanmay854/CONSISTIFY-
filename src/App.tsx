import { useEffect, useState } from "react";
import Loader from "./Loader";

function App() {
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  if (loading) return <Loader />;

  return (
    <div>
      {/* Your existing app code here */}
    </div>
  );
}

export default App;
