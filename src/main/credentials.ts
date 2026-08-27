import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

interface StoredEntry {
  username: string;
  /** Base64 of the OS-encrypted (safeStorage) password blob. Never plaintext. */
  encryptedPassword: string;
}

type CredentialsFile = Record<string, StoredEntry>;

function filePath(): string {
  return path.join(app.getPath("userData"), "credentials.json");
}

async function readFileSafe(): Promise<CredentialsFile> {
  try {
    const raw = await readFile(filePath(), "utf8");
    return JSON.parse(raw) as CredentialsFile;
  } catch {
    return {};
  }
}

async function writeFileSafe(data: CredentialsFile): Promise<void> {
  await mkdir(app.getPath("userData"), { recursive: true });
  await writeFile(filePath(), JSON.stringify(data, null, 2), "utf8");
}

/** OS-level secret storage (Keychain / DPAPI / libsecret) must be available to persist passwords. */
export function isSecureStorageAvailable(): boolean {
  return safeStorage.isEncryptionAvailable();
}

export async function saveAccount(serverId: string, username: string, password: string): Promise<boolean> {
  if (!isSecureStorageAvailable()) return false;
  const data = await readFileSafe();
  const encryptedPassword = safeStorage.encryptString(password).toString("base64");
  data[serverId] = { username, encryptedPassword };
  await writeFileSafe(data);
  return true;
}

export async function getAccountPublic(serverId: string): Promise<{ username: string } | null> {
  const data = await readFileSafe();
  const entry = data[serverId];
  if (!entry) return null;
  return { username: entry.username };
}

/** Decrypts and returns the saved login for auto-filling the server's login form. Main-process only. */
export async function getCredentials(serverId: string): Promise<{ username: string; password: string } | null> {
  const data = await readFileSafe();
  const entry = data[serverId];
  if (!entry) return null;
  if (!isSecureStorageAvailable()) return null;
  try {
    const password = safeStorage.decryptString(Buffer.from(entry.encryptedPassword, "base64"));
    return { username: entry.username, password };
  } catch {
    return null;
  }
}

export async function clearAccount(serverId: string): Promise<void> {
  const data = await readFileSafe();
  delete data[serverId];
  await writeFileSafe(data);
}
