import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";
import { useTheme } from "../state/ThemeContext";
import { THEME_PRESETS } from "../theme/presets";
import { isLyricsEnabled, setLyricsEnabled } from "../lib/lyricsSettings";

function swatchStyle(base: string | null): React.CSSProperties {
  if (base === "adaptive") {
    return { background: "conic-gradient(from 0deg, #ff5f6d, #ffc371, #47e0a7, #4facfe, #a86bff, #ff5f6d)" };
  }
  if (base === null) {
    return { background: "linear-gradient(135deg, #8e44ad, #bb86fc)" };
  }
  return { background: base };
}

function ThemePicker() {
  const { currentBase, setTheme } = useTheme();

  return (
    <div className="theme-swatch-grid">
      {THEME_PRESETS.map((preset) => {
        const isActive = preset.base === currentBase || (preset.base === null && !currentBase);
        return (
          <div
            key={preset.name}
            className={`theme-swatch ${isActive ? "active" : ""}`}
            onClick={() => setTheme(preset.base)}
          >
            <div className="swatch-circle" style={swatchStyle(preset.base)} />
            <span>{preset.name}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function Settings() {
  const { account } = useAuth();
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [version, setVersion] = useState("");
  const [saved, setSaved] = useState(false);
  const [lyricsEnabled, setLyricsEnabledState] = useState(isLyricsEnabled);

  useEffect(() => {
    void window.amethyst.discord.getSettings().then((s) => {
      setDiscordEnabled(s.enabled);
      setClientId(s.clientId);
    });
    void window.amethyst.app.getVersion().then(setVersion);
  }, []);

  const save = async () => {
    await window.amethyst.discord.setSettings({ enabled: discordEnabled, clientId: clientId.trim() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <>
      <div className="content-header">
        <h2>Settings</h2>
      </div>
      <div className="content-body" style={{ maxWidth: 620 }}>
        <h3>Account</h3>
        <p className="track-artist">
          Signed in as <strong>{account?.username}</strong> on {account?.server.name} ({account?.server.url})
        </p>

        <h3 style={{ marginTop: 32 }}>Theme</h3>
        <p className="track-artist">
          Pick a color and the rest of the interface (panels, buttons, text) is derived automatically. "Adaptive"
          re-themes the app to match whatever's currently playing.
        </p>
        <ThemePicker />

        <h3 style={{ marginTop: 32 }}>Lyrics</h3>
        <p className="track-artist">
          Synced lyrics are looked up on{" "}
          <a href="https://lrclib.net" target="_blank" rel="noreferrer">
            lrclib.net
          </a>
          , a free public lyrics database — the track title and artist are sent there, never your server credentials.
        </p>
        <div className="checkbox-row" style={{ margin: "12px 0" }}>
          <input
            type="checkbox"
            id="lyrics-enabled"
            checked={lyricsEnabled}
            onChange={(e) => {
              setLyricsEnabledState(e.target.checked);
              setLyricsEnabled(e.target.checked);
            }}
          />
          <label htmlFor="lyrics-enabled">Show synced lyrics in the fullscreen player</label>
        </div>

        <h3 style={{ marginTop: 32 }}>Discord Rich Presence</h3>
        <p className="track-artist">
          Show what you're listening to on your Discord profile. Requires a Discord Application Client ID — create
          one for free at{" "}
          <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
            discord.com/developers/applications
          </a>{" "}
          and paste its Client ID below.
        </p>
        <div className="checkbox-row" style={{ margin: "12px 0" }}>
          <input
            type="checkbox"
            id="discord-enabled"
            checked={discordEnabled}
            onChange={(e) => setDiscordEnabled(e.target.checked)}
          />
          <label htmlFor="discord-enabled">Enable Discord Rich Presence</label>
        </div>
        <div className="field">
          <label>Discord Application Client ID</label>
          <input value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="123456789012345678" />
        </div>
        <button className="btn" onClick={save}>
          {saved ? "Saved ✓" : "Save"}
        </button>

        <h3 style={{ marginTop: 32 }}>About</h3>
        <p className="track-artist">Amethyst Music Desktop v{version}</p>
      </div>
    </>
  );
}
