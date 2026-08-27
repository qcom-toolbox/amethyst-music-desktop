import { useState } from "react";
import ServerPicker from "./pages/ServerPicker";
import Settings from "./pages/Settings";

export default function App() {
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="app-shell">
      <button
        className="icon-btn"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 10 }}
        onClick={() => setShowSettings((v) => !v)}
        title="Settings"
      >
        ⚙
      </button>
      {showSettings ? <Settings onClose={() => setShowSettings(false)} /> : <ServerPicker />}
    </div>
  );
}
