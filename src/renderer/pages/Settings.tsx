import { useEffect, useState } from "react";
import type { ApiServerStatus, DiscordRpcStatus } from "../../shared/types";

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

function ApiServerStatusLine({ enabled, status }: { enabled: boolean; status: ApiServerStatus | null }) {
  if (!enabled || !status) return null;

  const color = status.lastError ? "var(--danger)" : status.running ? "#2ecc71" : "var(--text-muted)";
  const text = status.lastError ? status.lastError : status.running ? "Running ✓" : "Starting…";

  return (
    <p className="hint-text" style={{ color, textAlign: "left", marginTop: 8 }}>
      {text}
    </p>
  );
}

export default function Settings({ onClose }: { onClose: () => void }) {
  const [discordEnabled, setDiscordEnabled] = useState(false);
  const [clientId, setClientId] = useState("");
  const [showLyrics, setShowLyrics] = useState(false);
  const [version, setVersion] = useState("");
  const [saved, setSaved] = useState(false);
  const [status, setStatus] = useState<DiscordRpcStatus | null>(null);

  const [apiServerEnabled, setApiServerEnabled] = useState(false);
  const [apiServerPort, setApiServerPort] = useState("26538");
  const [apiServerSaved, setApiServerSaved] = useState(false);
  const [apiServerStatus, setApiServerStatus] = useState<ApiServerStatus | null>(null);

  useEffect(() => {
    void window.amethyst.discord.getSettings().then((s) => {
      setDiscordEnabled(s.enabled);
      setClientId(s.clientId);
      setShowLyrics(s.showLyrics);
    });
    void window.amethyst.apiServer.getSettings().then((s) => {
      setApiServerEnabled(s.enabled);
      setApiServerPort(String(s.port));
    });
    void window.amethyst.app.getVersion().then(setVersion);
  }, []);

  useEffect(() => {
    let cancelled = false;
    const poll = () => {
      void window.amethyst.discord.getStatus().then((s) => {
        if (!cancelled) setStatus(s);
      });
      void window.amethyst.apiServer.getStatus().then((s) => {
        if (!cancelled) setApiServerStatus(s);
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
    await window.amethyst.discord.setSettings({
      enabled: discordEnabled,
      clientId: clientId.trim(),
      showLyrics
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const saveApiServer = async () => {
    const port = parseInt(apiServerPort, 10) || 26538;
    await window.amethyst.apiServer.setSettings({ enabled: apiServerEnabled, port });
    setApiServerSaved(true);
    setTimeout(() => setApiServerSaved(false), 2000);
  };

  return (
    <div className="center-screen">
      <div className="auth-card" style={{ width: 440 }}>
        <h1>Settings</h1>
        <p className="subtitle">Discord Rich Presence, the song-info API server, &amp; app info.</p>

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
        <div className="checkbox-row" style={{ margin: "12px 0" }}>
          <input
            type="checkbox"
            id="discord-lyrics"
            checked={showLyrics}
            onChange={(e) => setShowLyrics(e.target.checked)}
          />
          <label htmlFor="discord-lyrics">Show live lyrics instead of the album name</label>
        </div>
        <p className="hint-text" style={{ textAlign: "left", marginTop: -6, marginBottom: 10 }}>
          Nothing is looked up on its own — this only shows the current line where the album name normally goes once
          you've opened the Lyrics tab in the fullscreen player for a track that has synced lyrics.
        </p>
        <button className="btn-primary" onClick={save}>
          {saved ? "Saved ✓" : "Save"}
        </button>
        <StatusLine status={status} />

        <div style={{ borderTop: "1px solid var(--border)", marginTop: 24, paddingTop: 20 }}>
          <h1 style={{ fontSize: "1.1em" }}>Song-Info API Server</h1>
          <p className="track-artist" style={{ marginBottom: 10 }}>
            Lets a companion app on this computer — like{" "}
            <a
              href="https://github.com/qcom-toolbox/Lyrics-Player-GUI"
              target="_blank"
              rel="noreferrer"
            >
              Lyrics-Player-GUI
            </a>{" "}
            — read what's currently playing: cover, title, artist, and album, nothing else (no playback position, no
            remote control). Speaks the same <code>GET /api/v1/song</code> shape as Pear Music Desktop's API server,
            so a companion app already built for Pear works against this app too, unchanged.
          </p>
          <div className="checkbox-row" style={{ margin: "12px 0" }}>
            <input
              type="checkbox"
              id="apiserver-enabled"
              checked={apiServerEnabled}
              onChange={(e) => setApiServerEnabled(e.target.checked)}
            />
            <label htmlFor="apiserver-enabled">Enable the song-info API server</label>
          </div>
          <div className="field">
            <label>Port</label>
            <input
              value={apiServerPort}
              onChange={(e) => setApiServerPort(e.target.value.replace(/\D/g, ""))}
              placeholder="26538"
            />
          </div>
          <p className="hint-text" style={{ textAlign: "left", marginTop: -6, marginBottom: 10 }}>
            Not authenticated — only reachable from this computer (localhost), but anything running locally that
            knows the port can read it.
          </p>
          <button className="btn-primary" onClick={saveApiServer}>
            {apiServerSaved ? "Saved ✓" : "Save"}
          </button>
          <ApiServerStatusLine enabled={apiServerEnabled} status={apiServerStatus} />
        </div>

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
