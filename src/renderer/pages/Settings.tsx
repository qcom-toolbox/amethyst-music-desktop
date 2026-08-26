import { useEffect, useState } from "react";
import { useAuth } from "../state/AuthContext";

export default function Settings() {
  const { account } = useAuth();
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
    <>
      <div className="content-header">
        <h2>Settings</h2>
      </div>
      <div className="content-body" style={{ maxWidth: 520 }}>
        <h3>Account</h3>
        <p className="track-artist">
          Signed in as <strong>{account?.username}</strong> on {account?.server.name} ({account?.server.url})
        </p>

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
