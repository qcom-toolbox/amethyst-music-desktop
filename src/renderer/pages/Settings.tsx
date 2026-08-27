import { useEffect, useState } from "react";

export default function Settings({ onClose }: { onClose: () => void }) {
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [version, setVersion] = useState("");
  const [saved, setSaved] = useState(false);

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
    <div className="center-screen">
      <div className="auth-card" style={{ width: 440 }}>
        <h1>Settings</h1>
        <p className="subtitle">Discord Rich Presence &amp; app info.</p>

        <p className="track-artist" style={{ marginBottom: 10 }}>
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
        <button className="btn-primary" onClick={save}>
          {saved ? "Saved ✓" : "Save"}
        </button>

        <p className="hint-text">Amethyst Music Desktop v{version}</p>
        <p className="hint-text">
          <button type="button" className="link-btn" onClick={onClose}>
            Back
          </button>
        </p>
      </div>
    </div>
  );
}
