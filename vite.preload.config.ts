import { defineConfig } from "vite";
import { resolve } from "node:path";

// Electron's sandboxed preload (webPreferences.sandbox: true, see src/main/index.ts)
// can only `require()` a small allowlist of built-in modules by name — it cannot
// resolve arbitrary local relative paths like `../shared/ipcChannels`. So unlike
// main (plain tsc output, running in a full Node context), the preload script must
// be bundled into one self-contained file with everything it imports inlined.
export default defineConfig({
  build: {
    outDir: resolve(__dirname, "dist/preload"),
    emptyOutDir: true,
    minify: false,
    target: "node20",
    lib: {
      entry: resolve(__dirname, "src/preload/index.ts"),
      formats: ["cjs"],
      fileName: () => "index.js"
    },
    rollupOptions: {
      external: ["electron"]
    }
  }
});
