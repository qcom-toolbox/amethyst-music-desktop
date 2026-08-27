import { app } from "electron";
import { randomUUID } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { ServerConfig } from "../shared/types";

interface ServersFile {
  servers: ServerConfig[];
}

function filePath(): string {
  return path.join(app.getPath("userData"), "servers.json");
}

async function readFileSafe(): Promise<ServersFile> {
  try {
    const raw = await readFile(filePath(), "utf8");
    const parsed = JSON.parse(raw) as ServersFile;
    if (!Array.isArray(parsed.servers)) return { servers: [] };
    return parsed;
  } catch {
    return { servers: [] };
  }
}

async function writeFileSafe(data: ServersFile): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(filePath(), JSON.stringify(data, null, 2), "utf8");
}

export function normalizeServerUrl(input: string): string {
  let url = input.trim();
  if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
  return url.replace(/\/+$/, "");
}

export async function listServers(): Promise<ServerConfig[]> {
  const data = await readFileSafe();
  return data.servers;
}

export async function addServer(name: string, rawUrl: string): Promise<ServerConfig> {
  const data = await readFileSafe();
  const url = normalizeServerUrl(rawUrl);
  const existing = data.servers.find((s) => s.url === url);
  if (existing) return existing;

  const server: ServerConfig = { id: randomUUID(), name: name.trim() || url, url };
  data.servers.push(server);
  await writeFileSafe(data);
  return server;
}

export async function removeServer(id: string): Promise<void> {
  const data = await readFileSafe();
  data.servers = data.servers.filter((s) => s.id !== id);
  await writeFileSafe(data);
}

/** Quick reachability probe: does `<url>/index.php` respond at all? Best-effort only. */
export async function pingServer(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${url}/index.php`, { method: "GET", signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}
