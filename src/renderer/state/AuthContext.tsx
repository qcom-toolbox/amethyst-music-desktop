import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ServerConfig } from "../../shared/types";

interface Account {
  server: ServerConfig;
  username: string;
  isAdmin: boolean;
}

interface AuthContextValue {
  loading: boolean;
  account: Account | null;
  login: (serverId: string, username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  quickLogin: (server: ServerConfig) => Promise<{ ok: boolean; message?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.amethyst.auth
      .currentAccount()
      .then((acc) => setAccount(acc))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (serverId: string, username: string, password: string) => {
    const result = await window.amethyst.auth.login(serverId, username, password);
    if (result.status === "success") {
      const servers = await window.amethyst.servers.list();
      const server = servers.find((s) => s.id === serverId);
      if (server) {
        setAccount({ server, username: result.username ?? username, isAdmin: Boolean(result.is_admin) });
      }
      return { ok: true };
    }
    return { ok: false, message: result.message ?? "Login failed" };
  }, []);

  const quickLogin = useCallback(async (server: ServerConfig) => {
    const result = await window.amethyst.auth.quickLogin(server.id);
    if (result.status === "success") {
      setAccount({ server, username: result.username ?? "", isAdmin: Boolean(result.is_admin) });
      return { ok: true };
    }
    return { ok: false, message: result.message ?? "Login failed" };
  }, []);

  const logout = useCallback(async () => {
    await window.amethyst.auth.logout();
    setAccount(null);
  }, []);

  const value = useMemo(
    () => ({ loading, account, login, quickLogin, logout }),
    [loading, account, login, quickLogin, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
