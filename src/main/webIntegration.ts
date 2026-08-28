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

/**
 * Polls the page's own now-playing DOM (mini player bar) every few seconds and:
 *  - reports it back for Discord Rich Presence, and
 *  - drives the OS "Now Playing" integration (macOS Control Center / media keys,
 *    same on Windows' SMTC and Linux's MPRIS) via the standard Web MediaSession
 *    API, which Chromium wires up to the OS for free — no native module needed.
 * Play/pause/seek act directly on the real <audio id="mainAudio"> element;
 * previous/next call the page's own global prevTrack()/nextTrack() (the same
 * functions its own onclick="prevTrack()" buttons call).
 */
function pollerScript(): string {
  return `(function() {
    if (window.__amethystPollerInstalled) return;
    window.__amethystPollerInstalled = true;

    const log = function(msg) { console.log('[amethyst-poller] ' + msg); };

    const audio = document.getElementById('mainAudio');
    let lastMetaKey = '';

    log('mainAudio found: ' + Boolean(audio) + ', mediaSession available: ' + ('mediaSession' in navigator));

    if (audio && 'mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', function() { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function() { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', function() {
        if (typeof window.prevTrack === 'function') window.prevTrack();
      });
      navigator.mediaSession.setActionHandler('nexttrack', function() {
        if (typeof window.nextTrack === 'function') window.nextTrack();
      });
      try {
        navigator.mediaSession.setActionHandler('seekbackward', function(details) {
          audio.currentTime = Math.max(0, audio.currentTime - (details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekforward', function(details) {
          audio.currentTime = Math.min(audio.duration || audio.currentTime, audio.currentTime + (details.seekOffset || 10));
        });
        navigator.mediaSession.setActionHandler('seekto', function(details) {
          if (details.seekTime != null) audio.currentTime = details.seekTime;
        });
        log('action handlers registered OK');
      } catch (e) {
        log('setActionHandler threw: ' + e);
      }
    }

    setInterval(function() {
      const titleEl = document.getElementById('play-title');
      const statusEl = document.getElementById('play-status');
      const coverEl = document.getElementById('player-cover');

      if (!audio || !audio.currentSrc) {
        if (window.__amethystReporter) window.__amethystReporter.nowPlaying(null);
        if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'none';
        return;
      }

      const title = (titleEl && titleEl.innerText) || '';
      const artist = ((statusEl && statusEl.textContent) || '').split('\\u2022')[0].trim();
      const cover = (coverEl && coverEl.src) || '';

      if (window.__amethystReporter) {
        window.__amethystReporter.nowPlaying({
          title: title,
          artist: artist,
          cover: cover,
          isPlaying: !audio.paused,
          position: audio.currentTime || 0,
          duration: audio.duration || 0
        });
      }

      if ('mediaSession' in navigator) {
        navigator.mediaSession.playbackState = audio.paused ? 'paused' : 'playing';
        const metaKey = title + '::' + artist + '::' + cover;
        if (metaKey !== lastMetaKey) {
          lastMetaKey = metaKey;
          try {
            navigator.mediaSession.metadata = new MediaMetadata({
              title: title,
              artist: artist,
              artwork: cover ? [{ src: cover, sizes: '512x512', type: 'image/png' }] : []
            });
            log('metadata set: "' + title + '" by "' + artist + '", cover=' + (cover || '(none)'));
          } catch (e) {
            log('MediaMetadata threw: ' + e);
          }
        }
        if (audio.duration && isFinite(audio.duration)) {
          try {
            navigator.mediaSession.setPositionState({
              duration: audio.duration,
              playbackRate: audio.playbackRate || 1,
              position: Math.min(audio.currentTime || 0, audio.duration)
            });
          } catch (e) {
            log('setPositionState threw: ' + e);
          }
        }
      }
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
