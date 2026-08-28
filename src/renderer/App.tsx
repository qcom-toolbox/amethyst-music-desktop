import ServerPicker from "./pages/ServerPicker";
import Settings from "./pages/Settings";

const isSettingsWindow = new URLSearchParams(window.location.search).get("view") === "settings";

export default function App() {
  if (isSettingsWindow) {
    // This window has nothing to "go back" to — it only ever shows Settings.
    return <Settings onClose={() => window.close()} />;
  }

  return (
    <div className="app-shell">
      <button
        className="icon-btn"
        style={{ position: "fixed", top: 16, right: 16, zIndex: 10 }}
        onClick={() => void window.amethyst.app.openSettingsWindow()}
        title="Settings"
      >
        ⚙
      </button>
      <ServerPicker />
    </div>
  );
}
