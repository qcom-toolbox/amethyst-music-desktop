import { app } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export interface AppSettings {
  discordEnabled: boolean;
  discordClientId: string;
  lastServerId: string | null;
  volume: number;
}

const DEFAULTS: AppSettings = {
  discordEnabled: false,
  discordClientId: "",
  lastServerId: null,
  volume: 0.8
};

function filePath(): string {
  return path.join(app.getPath("userData"), "settings.json");
}

let cache: AppSettings | null = null;

export async function getSettings(): Promise<AppSettings> {
  if (cache) return cache;
  try {
    const raw = await readFile(filePath(), "utf8");
    cache = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<AppSettings>) };
  } catch {
    cache = { ...DEFAULTS };
  }
  return cache;
}

export async function updateSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const current = await getSettings();
  cache = { ...current, ...patch };
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(filePath(), JSON.stringify(cache, null, 2), "utf8");
  return cache;
}
