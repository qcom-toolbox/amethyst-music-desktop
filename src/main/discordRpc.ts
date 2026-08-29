// Minimal Discord Rich Presence client speaking Discord's local IPC protocol directly
// (https://discord.com/developers/docs/rich-presence/how-to — the wire format itself
// isn't formally published beyond community documentation of the reference client
// libraries, but it has been stable for years and is reimplemented here from scratch
// using only Node's built-in `net` module). This deliberately avoids adding the
// `discord-rpc` / `@xhayper/discord-rpc` npm packages as a dependency.
import { randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import path from "node:path";
import type { DiscordRpcStatus, NowPlaying } from "../shared/types";

const OP_HANDSHAKE = 0;
const OP_FRAME = 1;
const OP_CLOSE = 2;
const OP_PING = 3;
const OP_PONG = 4;

function candidateSocketPaths(index: number): string {
  if (process.platform === "win32") {
    return `\\\\.\\pipe\\discord-ipc-${index}`;
  }
  const base =
    process.env.XDG_RUNTIME_DIR ||
    process.env.TMPDIR ||
    process.env.TMP ||
    process.env.TEMP ||
    "/tmp";
  return path.join(base, `discord-ipc-${index}`);
}

function encodeFrame(opcode: number, payload: object): Buffer {
  const json = Buffer.from(JSON.stringify(payload), "utf8");
  const header = Buffer.alloc(8);
  header.writeInt32LE(opcode, 0);
  header.writeInt32LE(json.length, 4);
  return Buffer.concat([header, json]);
}

type State = "idle" | "connecting" | "connected";

export class DiscordRpcClient {
  private clientId: string | null = null;
  private socket: Socket | null = null;
  private state: State = "idle";
  private recvBuffer: Buffer = Buffer.alloc(0);
  private reconnectTimer: NodeJS.Timeout | null = null;
  private wantConnected = false;
  private startTimestamps = new Map<string, number>();
  private lastError: string | null = null;

  getStatus(): DiscordRpcStatus {
    return { enabled: this.wantConnected, state: this.state, lastError: this.lastError };
  }

  setClientId(clientId: string): void {
    if (this.clientId !== clientId) {
      this.disconnect();
      this.clientId = clientId;
      this.lastError = null;
    }
  }

  enable(): void {
    this.wantConnected = true;
    this.tryConnect();
  }

  disable(): void {
    this.wantConnected = false;
    this.lastError = null;
    this.disconnect();
  }

  private scheduleReconnect(): void {
    if (!this.wantConnected || this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.tryConnect();
    }, 15000);
  }

  private tryConnect(attempt = 0): void {
    if (!this.wantConnected || !this.clientId || this.state !== "idle") return;
    if (attempt > 9) {
      this.lastError = "Discord doesn't appear to be running (no discord-ipc-N socket found).";
      this.scheduleReconnect();
      return;
    }
    this.state = "connecting";
    const socketPath = candidateSocketPaths(attempt);
    const socket = net.createConnection(socketPath);

    const onFail = () => {
      socket.removeAllListeners();
      socket.destroy();
      if (this.state === "connecting") {
        this.state = "idle";
        this.tryConnect(attempt + 1);
      }
    };

    socket.once("error", onFail);
    socket.once("connect", () => {
      socket.removeListener("error", onFail);
      this.socket = socket;
      this.state = "connected";
      this.recvBuffer = Buffer.alloc(0);
      socket.write(encodeFrame(OP_HANDSHAKE, { v: 1, client_id: this.clientId }));
      socket.on("data", (chunk) => this.onData(chunk));
      socket.on("close", () => this.onDisconnected());
      socket.on("error", () => this.onDisconnected());
    });
  }

  private onDisconnected(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.state = "idle";
    this.scheduleReconnect();
  }

  private disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try {
        this.socket.write(encodeFrame(OP_CLOSE, {}));
      } catch {
        // socket may already be unusable — ignore, we're tearing it down anyway
      }
      this.socket.removeAllListeners();
      this.socket.destroy();
      this.socket = null;
    }
    this.state = "idle";
  }

  private onData(chunk: Buffer): void {
    this.recvBuffer = Buffer.concat([this.recvBuffer, chunk]);
    while (this.recvBuffer.length >= 8) {
      const opcode = this.recvBuffer.readInt32LE(0);
      const length = this.recvBuffer.readInt32LE(4);
      if (this.recvBuffer.length < 8 + length) break;
      const payload = this.recvBuffer.subarray(8, 8 + length);
      this.recvBuffer = this.recvBuffer.subarray(8 + length);
      this.handleFrame(opcode, payload);
    }
  }

  private handleFrame(opcode: number, payload: Buffer): void {
    if (opcode === OP_PING) {
      this.socket?.write(encodeFrame(OP_PONG, JSON.parse(payload.toString("utf8") || "{}")));
      return;
    }

    if (opcode === OP_CLOSE) {
      // Discord rejects the handshake this way — most commonly {"code":4000,"message":"Invalid Client ID"}
      // when the configured Client ID doesn't match a real registered Discord Application.
      try {
        const parsed = JSON.parse(payload.toString("utf8")) as { code?: number; message?: string };
        this.lastError = parsed.message ? `Discord: ${parsed.message}` : "Discord closed the connection.";
      } catch {
        this.lastError = "Discord closed the connection.";
      }
      console.error(`[discordRpc] ${this.lastError}`);
      return;
    }

    if (opcode === OP_FRAME) {
      try {
        const parsed = JSON.parse(payload.toString("utf8")) as { cmd?: string; evt?: string };
        if (parsed.cmd === "DISPATCH" && parsed.evt === "READY") {
          this.lastError = null;
        }
      } catch {
        // non-JSON or unrecognized frame — nothing to act on
      }
    }
  }

  private send(cmd: string, args: object): void {
    if (this.state !== "connected" || !this.socket) return;
    this.socket.write(encodeFrame(OP_FRAME, { cmd, args, nonce: randomUUID() }));
  }

  setActivity(presence: NowPlaying): void {
    if (this.state !== "connected") return;

    const key = `${presence.title}::${presence.artist}`;
    let startedAt = this.startTimestamps.get(key);
    if (!startedAt) {
      startedAt = Date.now() - presence.position * 1000;
      this.startTimestamps.clear();
      this.startTimestamps.set(key, startedAt);
    }

    const timestamps = presence.isPlaying
      ? { start: startedAt, end: startedAt + presence.duration * 1000 }
      : undefined;

    // The actual album/track cover art from the user's library, passed straight
    // through as an external image URL — Discord's client fetches and caches it
    // itself, no pre-uploaded "Art Asset" needed (this is the same mechanism
    // Spotify's own Discord integration uses to show real, per-track artwork).
    const hasCover = /^https?:\/\//i.test(presence.cover);

    // Discord's Activity object only has two free-text lines (details/state) —
    // there's no separate "album" line. Folding it into state as "Artist — Album"
    // matches how other Listening-type integrations (Spotify, YouTube Music)
    // display it; Discord's client word-wraps the combined string on its own.
    const state = presence.album ? `${presence.artist} — ${presence.album}` : presence.artist;

    this.send("SET_ACTIVITY", {
      pid: process.pid,
      activity: {
        // type: 2 = Listening (Discord shows "Listening to <Application Name>" as
        // the header instead of the default "Playing <Application Name>"). The
        // <Application Name> part is fixed to whatever the Discord Application is
        // named in the Developer Portal — Discord doesn't let RPC clients override
        // it per-update (this is deliberate on their end, so the header reliably
        // identifies which app is reporting; it's why Spotify's own integration
        // says "Listening to Spotify", not "Listening to <song>" either). The song
        // title/artist go in details/state below, which is the part we do control.
        type: 2,
        details: presence.title.slice(0, 128),
        state: state.slice(0, 128),
        ...(hasCover
          ? { assets: { large_image: presence.cover, large_text: "Amethyst Music" } }
          : {}),
        ...(timestamps ? { timestamps } : {}),
        instance: false
      }
    });
  }

  clearActivity(): void {
    this.startTimestamps.clear();
    if (this.state !== "connected") return;
    this.send("SET_ACTIVITY", { pid: process.pid, activity: null });
  }
}

export const discordRpc = new DiscordRpcClient();
