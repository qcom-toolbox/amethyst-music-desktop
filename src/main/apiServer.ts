// A tiny local HTTP server exposing the currently-playing song (title, artist,
// album, cover, elapsed position, pause state) plus basic playback control
// (play/pause/toggle/next/previous/seek) — no queue, search, volume, likes, or
// auth. It speaks the same routes (and default port 26538) as Pear Music
// Desktop's API server (https://github.com/pear-devs/pear-desktop,
// src/plugins/api-server), which is what third-party companion apps like
// https://github.com/qcom-toolbox/Lyrics-Player-GUI already know how to poll
// and, for controls, what any future Pear-compatible remote could already know
// how to call — pointing one of those at this app instead of Pear works
// without any changes on their end. Built on Node's own `http` module rather
// than Pear's stack (Hono/Zod/JWT/ws) to keep this dependency-free, which this
// reduced, unauthenticated scope doesn't need anyway.
import { createServer, type Server } from "node:http";
import { getNowPlaying } from "./nowPlayingStore";
import { controlPlayback, seekPlayback, type PlaybackAction } from "./webIntegration";
import { getWindow } from "./windowManager";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

const PLAYBACK_ROUTES: Record<string, PlaybackAction> = {
  "/api/v1/play": "play",
  "/api/v1/pause": "pause",
  "/api/v1/toggle-play": "toggle",
  "/api/v1/next": "next",
  "/api/v1/previous": "previous"
};

let server: Server | null = null;
let lastError: string | null = null;

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
}

function sendNoContent(res: import("node:http").ServerResponse): void {
  res.writeHead(204, CORS_HEADERS);
  res.end();
}

function readJsonBody(req: import("node:http").IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk: Buffer) => {
      raw += chunk.toString("utf8");
      if (raw.length > 1024) req.destroy(); // a seek body is a few bytes; bail on anything absurd
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (err) {
        reject(err);
      }
    });
    req.on("error", reject);
  });
}

export function start(port: number): void {
  stop();
  lastError = null;

  server = createServer((req, res) => {
    if (req.method === "OPTIONS") {
      res.writeHead(204, CORS_HEADERS);
      res.end();
      return;
    }

    const path = (req.url ?? "/").split("?")[0];

    if (req.method === "GET" && path === "/api/v1/song") {
      const now = getNowPlaying();
      sendJson(res, 200, {
        title: now?.title ?? "",
        artist: now?.artist ?? "",
        album: now?.album || null,
        imageSrc: now?.cover || null,
        elapsedSeconds: now?.position ?? 0,
        isPaused: now ? !now.isPlaying : true
      });
      return;
    }

    if (req.method === "POST" && path in PLAYBACK_ROUTES) {
      controlPlayback(getWindow(), PLAYBACK_ROUTES[path]);
      sendNoContent(res);
      return;
    }

    if (req.method === "POST" && path === "/api/v1/seek-to") {
      void readJsonBody(req)
        .then((body) => {
          const seconds = (body as { seconds?: unknown })?.seconds;
          if (typeof seconds !== "number") {
            sendJson(res, 400, { error: "expected a numeric 'seconds' field" });
            return;
          }
          seekPlayback(getWindow(), seconds);
          sendNoContent(res);
        })
        .catch(() => sendJson(res, 400, { error: "invalid JSON body" }));
      return;
    }

    sendJson(res, 404, { error: "not found" });
  });

  server.on("error", (err) => {
    lastError = err.message;
    console.error("[apiServer]", err);
  });

  // Loopback-only by default (unlike Pear's own 0.0.0.0 default) since this
  // has no authentication at all — matching what it's for (Lyrics-Player-GUI
  // can't do Pear's auth handshake either, so it only ever talks to
  // localhost). Anyone who can reach this port sees and controls playback.
  server.listen(port, "127.0.0.1");
}

export function stop(): void {
  server?.close();
  server = null;
}

export function getStatus(): { running: boolean; lastError: string | null } {
  return { running: server !== null, lastError };
}
