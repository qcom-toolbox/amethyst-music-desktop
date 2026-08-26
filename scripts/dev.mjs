// Zero-dependency dev orchestrator: runs the Vite dev server for the renderer,
// watch-compiles the main/preload TypeScript, and (re)launches Electron on change.
// Deliberately hand-rolled instead of pulling in `concurrently`/`wait-on`/`electron-vite`
// to keep the dependency tree minimal.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import http from "node:http";

const root = path.resolve(import.meta.dirname, "..");
const bin = (name) => path.join(root, "node_modules", ".bin", name);

const children = [];
function spawnChild(command, args, opts = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
    ...opts
  });
  children.push(child);
  return child;
}

function killAll() {
  for (const child of children) {
    if (!child.killed) child.kill();
  }
}

process.on("SIGINT", () => {
  killAll();
  process.exit(0);
});
process.on("SIGTERM", () => {
  killAll();
  process.exit(0);
});
process.on("exit", killAll);

function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const attempt = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve();
      });
      req.on("error", () => {
        if (Date.now() > deadline) reject(new Error(`Timed out waiting for ${url}`));
        else setTimeout(attempt, 200);
      });
    };
    attempt();
  });
}

async function main() {
  console.log("[dev] starting Vite renderer dev server...");
  spawnChild(bin("vite"), []);
  await waitForHttp("http://localhost:5173");

  console.log("[dev] compiling main/preload...");
  const tscBuild = spawnChild(bin("tsc"), ["-p", "tsconfig.node.json"]);
  await new Promise((resolve, reject) => {
    tscBuild.on("exit", (code) => (code === 0 ? resolve() : reject(new Error("tsc build failed"))));
  });

  console.log("[dev] watching main/preload for changes...");
  spawnChild(bin("tsc"), ["-p", "tsconfig.node.json", "--watch", "--preserveWatchOutput"]);

  let electronProc = null;
  const mainEntry = path.join(root, "dist", "main", "index.js");

  function launchElectron() {
    if (electronProc && !electronProc.killed) electronProc.kill();
    if (!existsSync(mainEntry)) return;
    console.log("[dev] launching Electron...");
    electronProc = spawnChild(bin("electron"), [mainEntry], {
      env: { ...process.env, ELECTRON_RENDERER_URL: "http://localhost:5173", NODE_ENV: "development" }
    });
    electronProc.on("exit", (code) => {
      if (code !== null) console.log(`[dev] Electron exited (${code})`);
    });
  }

  launchElectron();

  // Debounced restart on any change under dist/main or dist/preload.
  let restartTimer = null;
  const { watch } = await import("node:fs");
  watch(path.join(root, "dist"), { recursive: true }, () => {
    clearTimeout(restartTimer);
    restartTimer = setTimeout(launchElectron, 300);
  });

  await sleep(24 * 60 * 60 * 1000);
}

main().catch((err) => {
  console.error(err);
  killAll();
  process.exit(1);
});
