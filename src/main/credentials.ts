import { app, safeStorage } from "electron";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

interface StoredEntry {
  username: string;
  isAdmin: boolean;
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

export async function saveAccount(
  serverId: string,
  username: string,
  password: string,
  isAdmin: boolean
): Promise<boolean> {
  if (!isSecureStorageAvailable()) return false;
  const data = await readFileSafe();
  const encryptedPassword = safeStorage.encryptString(password).toString("base64");
  data[serverId] = { username, isAdmin, encryptedPassword };
  await writeFileSafe(data);
  return true;
}

export async function getAccountPublic(
  serverId: string
): Promise<{ username: string; isAdmin: boolean } | null> {
  const data = await readFileSafe();
  const entry = data[serverId];
  if (!entry) return null;
  return { username: entry.username, isAdmin: entry.isAdmin };
}

/** Decrypts and returns the password for building an authenticated API request. Main-process only — never sent to the renderer. */
export async function getPassword(serverId: string): Promise<string | null> {
  const data = await readFileSafe();
  const entry = data[serverId];
  if (!entry) return null;
  if (!isSecureStorageAvailable()) return null;
  try {
    return safeStorage.decryptString(Buffer.from(entry.encryptedPassword, "base64"));
  } catch {
    return null;
  }
}

export async function clearAccount(serverId: string): Promise<void> {
  const data = await readFileSafe();
  delete data[serverId];
  await writeFileSafe(data);
}
