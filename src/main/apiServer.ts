// A tiny local HTTP server that reports only the currently-playing song's
// info (title, artist, album, cover) as JSON — nothing else (no playback
// position, no controls, no auth). It speaks the same `GET /api/v1/song`
// shape (and default port 26538) as Pear Music Desktop's API server
// (https://github.com/pear-devs/pear-desktop, src/plugins/api-server), which
// is what third-party companion apps like
// https://github.com/qcom-toolbox/Lyrics-Player-GUI already know how to poll
// — pointing one of those at this app instead of Pear works without any
// changes on their end. Built on Node's own `http` module rather than Pear's
// stack (Hono/Zod/JWT/ws) to keep this dependency-free, which this reduced,
// read-only, unauthenticated scope doesn't need anyway.
import { createServer, type Server } from "node:http";
import { getNowPlaying } from "./nowPlayingStore";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

let server: Server | null = null;
let lastError: string | null = null;

function sendJson(res: import("node:http").ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8", ...CORS_HEADERS });
  res.end(JSON.stringify(body));
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
        imageSrc: now?.cover || null
      });
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
  // localhost). Anyone who can reach this port sees the current song.
  server.listen(port, "127.0.0.1");
}

export function stop(): void {
  server?.close();
  server = null;
}

export function getStatus(): { running: boolean; lastError: string | null } {
  return { running: server !== null, lastError };
}
