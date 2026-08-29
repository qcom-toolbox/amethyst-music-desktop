import { useEffect, useState } from "react";
import type { DiscordRpcStatus } from "../../shared/types";

function StatusLine({ status }: { status: DiscordRpcStatus | null }) {
  if (!status || !status.enabled) return null;

  let color = "var(--text-muted)";
  let text = "Checking…";
  if (status.lastError) {
    color = "var(--danger)";
    text = status.lastError;
  } else if (status.state === "connected") {
    color = "#2ecc71";
    text = "Connected to Discord ✓";
  } else if (status.state === "connecting") {
    color = "var(--accent)";
    text = "Connecting to Discord…";
  }

  return (
    <p className="hint-text" style={{ color, textAlign: "left", marginTop: 8 }}>
      {text}
    </p>
  );
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [version, setVersion] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<DiscordRpcStatus | null>(null);

  useEffect(() => {
    void window.amethyst.discord.getSettings().then((s) => {
      setDiscordEnabled(s.enabled);
      setClientId(s.clientId);
    });
    void window.amethyst.app.getVersion().then(setVersion);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      void window.amethyst.discord.getStatus().then((s) => {
        if (!cancelled) setStatus(s);
      });
    };
    poll();
    const interval = setInterval(poll, 2000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
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
          Show what you're listening to on your Discord profile. Create a free application at{" "}
          <a href="https://discord.com/developers/applications" target="_blank" rel="noreferrer">
            discord.com/developers/applications
          </a>{" "}
          → "New Application", then copy the <strong>Application ID</strong> shown on its General Information page
          (Discord's own UI calls it "Application ID" there, though it's the same thing as a "Client ID") and paste
          it below.
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
        <StatusLine status={status} />

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 20, textAlign: "center" }}>
          <img src="./icon.png" alt="" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 8 }} />
          <p style={{ margin: 0, fontWeight: 600 }}>Amethyst Music Desktop</p>
          <p className="hint-text" style={{ marginTop: 2 }}>Version {version}</p>
          <p className="hint-text">
            <a
              href="https://github.com/qcom-toolbox/amethyst-music-desktop"
              target="_blank"
              rel="noreferrer"
              className="link-btn"
            >
              github.com/qcom-toolbox/amethyst-music-desktop
            </a>
          </p>
          <p className="hint-text">Copyright © qcom-toolbox · MIT License</p>
        </div>

        <p className="hint-text">
          <button type="button" className="link-btn" onClick={onClose}>
            Close
          </button>
        </p>
      </div>
    </div>
  );
}
