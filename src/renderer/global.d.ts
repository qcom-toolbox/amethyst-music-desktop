import type { AmethystShellBridge } from "../preload/index";

declare global {
  interface Window {
    amethyst: AmethystShellBridge;
  }
}

export {};
