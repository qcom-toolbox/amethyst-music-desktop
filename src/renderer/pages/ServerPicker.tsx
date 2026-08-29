import { useEffect, useState } from "react";
import type { ServerConfig } from "../../shared/types";

type Step = { kind: "pick" } | { kind: "add" };

export default function ServerPicker() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [accounts, setAccounts] = useState<Record<string, { username: string } | null>>({});
  const [step, setStep] = useState<Step>({ kind: "pick" });
  const [loading, setLoading] = useState(true);
  const [connectingTo, setConnectingTo] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);

  const refresh = async () => {
    const list = await window.amethyst.servers.list();
    setServers(list);
    setStep(list.length === 0 ? { kind: "add" } : { kind: "pick" });
    setLoading(false);
    const entries = await Promise.all(
      list.map(async (s) => [s.id, await window.amethyst.servers.getAccount(s.id)] as const)
    );
    setAccounts(Object.fromEntries(entries));
  };

  useEffect(() => {
    void refresh();
  }, []);

  const connect = async (server: ServerConfig) => {
    setConnectingTo(server.id);
    setConnectError(null);
    const result = await window.amethyst.servers.connect(server.id);
    // On success the whole window navigates away to the real server and this
    // component unmounts — nothing left to do here. On failure it stays mounted.
    if (!result.ok) {
      setConnectingTo(null);
      setConnectError("Couldn't connect to that server.");
    }
  };

  if (loading) return <div className="center-screen">Loading…</div>;

  return (
    <div className="center-screen">
      {step.kind === "pick" && (
        <PickServer
          servers={servers}
          accounts={accounts}
          connectingTo={connectingTo}
          error={connectError}
          onSelect={connect}
          onAdd={() => setStep({ kind: "add" })}
          onChanged={refresh}
        />
      )}
      {step.kind === "add" && (
        <AddServer
          hasExisting={servers.length > 0}
          onBack={() => setStep({ kind: "pick" })}
          onAdded={(server) => {
            void refresh();
            void connect(server);
          }}
        />
      )}
    </div>
  );
}

function PickServer({
  servers,
  accounts,
  connectingTo,
  error,
  onSelect,
  onAdd,
  onChanged
}: {
  servers: ServerConfig[];
  accounts: Record<string, { username: string } | null>;
  connectingTo: string | null;
  error: string | null;
  onSelect: (s: ServerConfig) => void;
  onAdd: () => void;
  onChanged: () => void;
}) {
  return (
    <div className="auth-card">
      <h1>Choose a server</h1>
      <p className="subtitle">Pick the Amethyst Music server you want to connect to.</p>
      {servers.map((s) => {
        const account = accounts[s.id];
        return (
          <div className="server-row" key={s.id}>
            <div
              onClick={() => onSelect(s)}
              style={{ cursor: "pointer", flex: 1, opacity: connectingTo && connectingTo !== s.id ? 0.5 : 1 }}
            >
              <div className="server-name">{s.name}</div>
              <div className="server-url">
                {connectingTo === s.id ? "Connecting…" : account ? `Signed in as ${account.username}` : s.url}
              </div>
            </div>
            {account && (
              <button
                className="link-btn"
                onClick={async () => {
                  if (!confirm(`Disconnect the saved account "${account.username}" from ${s.name}?`)) return;
                  await window.amethyst.servers.disconnectAccount(s.id);
                  onChanged();
                }}
              >
                Disconnect
              </button>
            )}
            <button
              className="link-btn"
              onClick={async () => {
                await window.amethyst.servers.remove(s.id);
                onChanged();
              }}
            >
              Remove
            </button>
          </div>
        );
      })}
      {error && <p className="error-text">{error}</p>}
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
        setWarning("Couldn't reach index.php at that address yet — you can still continue and try connecting.");
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
