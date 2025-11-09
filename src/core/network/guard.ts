/**
 * Network kill switch for Local Mode
 * Blocks all network calls when processing locally
 */

import type { ProcessingMode } from "../processing/types";

let currentMode: ProcessingMode = "cloud";
const allowedLocalEndpoints = ["http://localhost", "http://127.0.0.1"];

/**
 * Set current processing mode
 */
export function setProcessingMode(mode: ProcessingMode) {
  currentMode = mode;
  console.log(`[NetworkGuard] Mode set to: ${mode}`);
}

/**
 * Get current processing mode
 */
export function getProcessingMode(): ProcessingMode {
  return currentMode;
}

/**
 * Check if a URL is allowed in current mode
 */
export function isNetworkAllowed(url: string): boolean {
  if (currentMode === "cloud") {
    return true; // All network calls allowed in cloud mode
  }

  if (currentMode === "local-lan") {
    // Allow only LAN endpoints
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname;

      // Allow private IP ranges
      if (
        hostname.startsWith("192.168.") ||
        hostname.startsWith("10.") ||
        hostname.startsWith("172.16.") ||
        hostname === "localhost" ||
        hostname === "127.0.0.1"
      ) {
        return true;
      }
    } catch {
      return false;
    }

    return false;
  }

  if (currentMode === "local-browser") {
    // Block ALL network calls
    return false;
  }

  return true; // Default: allow
}

/**
 * Guard function for fetch calls
 * Throw error if network call is not allowed
 */
export function guardedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;

  if (!isNetworkAllowed(url)) {
    throw new Error(
      `Network call blocked by Local Mode: ${url}\n` +
        `Current mode: ${currentMode}\n` +
        `To make network calls, switch to Cloud or Local LAN mode in Settings.`
    );
  }

  return fetch(input, init);
}

/**
 * Wrapper for Supabase client to enforce network guard
 */
export function createGuardedSupabaseClient(
  originalClient: any,
  mode: ProcessingMode
) {
  if (mode === "cloud" || mode === "local-lan") {
    return originalClient; // No guard needed
  }

  // In local-browser mode, wrap all methods
  return new Proxy(originalClient, {
    get(target, prop) {
      const value = target[prop];

      // If it's a function, wrap it
      if (typeof value === "function") {
        return new Proxy(value, {
          apply(fn, thisArg, args) {
            // Block all Supabase calls in local-browser mode
            throw new Error(
              `Supabase call blocked in Local Mode: ${String(prop)}\n` +
                `Local Mode ensures PHI never leaves device.\n` +
                `To sync data, switch to Cloud mode in Settings.`
            );
          },
        });
      }

      return value;
    },
  });
}

/**
 * Display network status badge
 */
export function getNetworkStatusBadge(): {
  text: string;
  variant: "success" | "warning" | "destructive";
  icon: string;
} {
  switch (currentMode) {
    case "local-browser":
      return {
        text: "🔒 On-Device Only",
        variant: "success",
        icon: "shield-check",
      };
    case "local-lan":
      return {
        text: "🏠 On-Premises",
        variant: "warning",
        icon: "home",
      };
    case "cloud":
    default:
      return {
        text: "☁️ Cloud Processing",
        variant: "destructive",
        icon: "cloud",
      };
  }
}
