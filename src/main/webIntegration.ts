// Drives the "tweaks" layered on top of the real Amethyst Music web UI once it's
// loaded directly into the window: detecting the server's own login page and
// auto-filling it from a saved credential, offering to save a credential after a
// successful first-time manual login, and polling the page's own now-playing DOM
// (it already renders everything we need) to drive Discord Rich Presence. No
// reimplementation of the web app's own UI/JS — we only ever read its DOM/audio
// element and, at most, click its own real login button.
import { BrowserWindow, dialog } from "electron";
import type { NowPlaying, ServerConfig } from "../shared/types";
import * as credentials from "./credentials";
import { discordRpc } from "./discordRpc";

function isLoginPageScript(): string {
  return `document.body.classList.contains('login-page')`;
}

function autofillScript(username: string, password: string): string {
  return `(function() {
    const form = document.querySelector('form');
    if (!form) return false;
    const u = form.querySelector('input[name="username"]');
    const p = form.querySelector('input[name="password"]');
    const btn = form.querySelector('button[name="login"]');
    if (!u || !p || !btn) return false;
    u.value = ${JSON.stringify(username)};
    p.value = ${JSON.stringify(password)};
    btn.click();
    return true;
  })();`;
}

/** Captures whatever the user types into the real login form, once, so we can offer to save it after a successful login — never sent anywhere but back to our own main process. */
function captureScript(): string {
  return `(function() {
    if (window.__amethystCaptureInstalled) return;
    window.__amethystCaptureInstalled = true;
    const form = document.querySelector('form');
    if (!form || !window.__amethystReporter) return;
    form.addEventListener('submit', function() {
      const u = form.querySelector('input[name="username"]');
      const p = form.querySelector('input[name="password"]');
      if (u && p && u.value && p.value) window.__amethystReporter.loginCapture(u.value, p.value);
    }, { once: true });
  })();`;
}

/** Polls the page's own now-playing DOM (mini player bar) every few seconds and reports it back for Discord Rich Presence. */
function pollerScript(): string {
  return `(function() {
    if (window.__amethystPollerInstalled) return;
    window.__amethystPollerInstalled = true;
    setInterval(function() {
      if (!window.__amethystReporter) return;
      const audio = document.getElementById('mainAudio');
      const titleEl = document.getElementById('play-title');
      const statusEl = document.getElementById('play-status');
      const coverEl = document.getElementById('player-cover');
      if (!audio || !audio.currentSrc) { window.__amethystReporter.nowPlaying(null); return; }
      const title = (titleEl && titleEl.innerText) || '';
      const artist = ((statusEl && statusEl.textContent) || '').split('\\u2022')[0].trim();
      const cover = (coverEl && coverEl.src) || '';
      window.__amethystReporter.nowPlaying({
        title: title,
        artist: artist,
        cover: cover,
        isPlaying: !audio.paused,
        position: audio.currentTime || 0,
        duration: audio.duration || 0
      });
    }, 4000);
  })();`;
}

let pendingCapturedLogin: { username: string; password: string } | null = null;
const autoLoginAttempted = new Set<string>();

/** Called whenever the window navigates to a (possibly different) server, to reset per-server state. */
export function setCurrentServer(server: ServerConfig | null): void {
  pendingCapturedLogin = null;
  if (server) autoLoginAttempted.delete(server.id);
}

export function reportLoginCapture(username: string, password: string): void {
  pendingCapturedLogin = { username, password };
}

export function reportNowPlaying(data: NowPlaying | null): void {
  if (!data || !data.title) {
    discordRpc.clearActivity();
    return;
  }
  discordRpc.setActivity(data);
}

/** Called on every did-finish-load. Only acts when the loaded page belongs to `server` (matched by the caller). */
export async function handlePageLoad(win: BrowserWindow, server: ServerConfig): Promise<void> {
  const wc = win.webContents;
  let onLoginPage: boolean;
  try {
    onLoginPage = Boolean(await wc.executeJavaScript(isLoginPageScript()));
  } catch {
    return;
  }

  if (!onLoginPage) {
    autoLoginAttempted.delete(server.id);
    const captured = pendingCapturedLogin;
    pendingCapturedLogin = null;
    if (captured && credentials.isSecureStorageAvailable()) {
      const existing = await credentials.getAccountPublic(server.id);
      if (!existing) {
        const { response } = await dialog.showMessageBox(win, {
          type: "question",
          buttons: ["Save login", "Not now"],
          defaultId: 0,
          title: "Save your login?",
          message: `Save your login for "${server.name}" so you don't have to type it again next time?`,
          detail: "Your password is encrypted with your OS keychain — this app never stores it in plain text."
        });
        if (response === 0) await credentials.saveAccount(server.id, captured.username, captured.password);
      }
    }
    void wc.executeJavaScript(pollerScript()).catch(() => {});
    return;
  }

  const saved = await credentials.getCredentials(server.id);
  if (saved) {
    if (autoLoginAttempted.has(server.id)) {
      // We already auto-submitted this saved credential and landed back on the
      // login page — it's stale or wrong. Drop it so the next launch shows a
      // fresh login form instead of silently failing forever.
      await credentials.clearAccount(server.id);
    } else {
      autoLoginAttempted.add(server.id);
      void wc.executeJavaScript(autofillScript(saved.username, saved.password)).catch(() => {});
      return;
    }
  }

  void wc.executeJavaScript(captureScript()).catch(() => {});
}
