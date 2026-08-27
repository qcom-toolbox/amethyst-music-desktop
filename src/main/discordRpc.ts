// Minimal Discord Rich Presence client speaking Discord's local IPC protocol directly
// (https://discord.com/developers/docs/rich-presence/how-to — the wire format itself
// isn't formally published beyond community documentation of the reference client
// libraries, but it has been stable for years and is reimplemented here from scratch
// using only Node's built-in `net` module). This deliberately avoids adding the
// `discord-rpc` / `@xhayper/discord-rpc` npm packages as a dependency.
import { randomUUID } from "node:crypto";
import net, { type Socket } from "node:net";
import path from "node:path";
import type { NowPlaying } from "../shared/types";

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

  setClientId(clientId: string): void {
    if (this.clientId !== clientId) {
      this.disconnect();
      this.clientId = clientId;
    }
  }

  enable(): void {
    this.wantConnected = true;
    this.tryConnect();
  }

  disable(): void {
    this.wantConnected = false;
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
    }
    // DISPATCH/READY and command responses are informational only for this app —
    // we fire-and-forget SET_ACTIVITY calls and don't need to correlate replies.
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

    this.send("SET_ACTIVITY", {
      pid: process.pid,
      activity: {
        details: presence.title.slice(0, 128),
        state: presence.artist.slice(0, 128),
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
