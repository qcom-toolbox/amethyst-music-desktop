import { useEffect, useState } from "react";
import type { ServerConfig } from "../../shared/types";
import { useAuth } from "../state/AuthContext";

type Step = { kind: "pick" } | { kind: "add" } | { kind: "login"; server: ServerConfig };

export default function AuthFlow() {
  const { login, quickLogin } = useAuth();
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [loadingServers, setLoadingServers] = useState(true);

  const refreshServers = async () => {
    const list = await window.amethyst.servers.list();
    setServers(list);
    setStep(list.length === 0 ? { kind: "add" } : { kind: "pick" });
    setLoadingServers(false);
  };

  useEffect(() => {
    void refreshServers();
  }, []);

  if (loadingServers) return <div className="center-screen">Loading…</div>;

  return (
    <div className="center-screen">
      {step.kind === "pick" && (
        <PickServer
          servers={servers}
          onSelect={(s) => setStep({ kind: "login", server: s })}
          onAdd={() => setStep({ kind: "add" })}
          onRemoved={refreshServers}
        />
      )}
      {step.kind === "add" && (
        <AddServer
          hasExisting={servers.length > 0}
          onBack={() => setStep({ kind: "pick" })}
          onAdded={(server) => {
            void refreshServers();
            setStep({ kind: "login", server });
          }}
        />
      )}
      {step.kind === "login" && (
        <LoginServer
          server={step.server}
          onBack={() => setStep({ kind: "pick" })}
          login={login}
          quickLogin={quickLogin}
        />
      )}
    </div>
  );
}

function PickServer({
  servers,
  onSelect,
  onAdd,
  onRemoved
}: {
  servers: ServerConfig[];
  onSelect: (s: ServerConfig) => void;
  onAdd: () => void;
  onRemoved: () => void;
}) {
  return (
    <div className="auth-card">
      <h1>Choose a server</h1>
      <p className="subtitle">Pick the Amethyst Music server you want to connect to.</p>
      {servers.map((s) => (
        <div className="server-row" key={s.id}>
          <div onClick={() => onSelect(s)} style={{ cursor: "pointer", flex: 1 }}>
            <div className="server-name">{s.name}</div>
            <div className="server-url">{s.url}</div>
          </div>
          <button
            className="link-btn"
            onClick={async () => {
              await window.amethyst.servers.remove(s.id);
              onRemoved();
            }}
          >
            Remove
          </button>
        </div>
      ))}
      <button className="btn" style={{ width: "100%", marginTop: 12 }} onClick={onAdd}>
        + Add another server
      </button>
    </div>
  );
}

function AddServer({
  hasExisting,
  onBack,
  onAdded
}: {
  hasExisting: boolean;
  onBack: () => void;
  onAdded: (server: ServerConfig) => void;
}) {
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const { server, reachable } = await window.amethyst.servers.add(name, url);
      if (!reachable) {
        setWarning("Couldn't reach api.php on that address yet — you can still continue and try logging in.");
      }
      onAdded(server);
    } catch {
      setError("Something went wrong adding that server.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="auth-card" onSubmit={submit}>
      <h1>Add a server</h1>
      <p className="subtitle">Enter the address of your self-hosted Amethyst Music instance.</p>
      <div className="field">
        <label>Server name (optional)</label>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Home server" />
      </div>
      <div className="field">
        <label>Server URL</label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://music.example.com"
          autoFocus
        />
      </div>
      {error && <p className="error-text">{error}</p>}
      {warning && <p className="error-text">{warning}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Checking…" : "Continue"}
      </button>
      {hasExisting && (
        <p className="hint-text">
          <button type="button" className="link-btn" onClick={onBack}>
            Back to server list
          </button>
        </p>
      )}
    </form>
  );
}

function LoginServer({
  server,
  onBack,
  login,
  quickLogin
}: {
  server: ServerConfig;
  onBack: () => void;
  login: (serverId: string, username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  quickLogin: (server: ServerConfig) => Promise<{ ok: boolean; message?: string }>;
}) {
  const [savedUsername, setSavedUsername] = useState<string | null>(null);
  const [showManualForm, setShowManualForm] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkingSaved, setCheckingSaved] = useState(true);

  useEffect(() => {
    void (async () => {
      const saved = await window.amethyst.auth.hasSavedCredentials(server.id);
      setSavedUsername(saved?.username ?? null);
      setCheckingSaved(false);
      setShowManualForm(!saved);
    })();
  }, [server.id]);

  const doQuickLogin = async () => {
    setBusy(true);
    setError(null);
    const result = await quickLogin(server);
    setBusy(false);
    if (!result.ok) {
      setError(result.message ?? "Couldn't sign in with the saved login.");
      setShowManualForm(true);
    }
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await login(server.id, username, password);
    setBusy(false);
    if (!result.ok) setError(result.message ?? "Login failed");
  };

  if (checkingSaved) return <div className="auth-card">Checking saved login…</div>;

  return (
    <div className="auth-card">
      <h1>{server.name}</h1>
      <p className="subtitle">{server.url}</p>

      {!showManualForm && savedUsername && (
        <>
          <button className="btn-primary" onClick={doQuickLogin} disabled={busy}>
            {busy ? "Signing in…" : `Continue as ${savedUsername}`}
          </button>
          {error && <p className="error-text">{error}</p>}
          <p className="hint-text">
            <button type="button" className="link-btn" onClick={() => setShowManualForm(true)}>
              Use a different account
            </button>
          </p>
        </>
      )}

      {showManualForm && (
        <form onSubmit={submitManual}>
          <div className="field">
            <label>Username</label>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn-primary" type="submit" disabled={busy || !username || !password}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      )}

      <p className="hint-text">
        <button type="button" className="link-btn" onClick={onBack}>
          Back to server list
        </button>
      </p>
    </div>
  );
}
