import type { AmethystBridge } from "../preload/index";

declare global {
  interface Window {
    amethyst: AmethystBridge;
  }
}

export {};
