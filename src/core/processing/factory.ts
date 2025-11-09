/**
 * Processing provider factory
 * Creates the appropriate provider based on configuration
 */

import type { ProcessingProvider, ProviderConfig, ProcessingMode } from "./types";
import { LocalBrowserProvider } from "./providers/local-browser-stub";

// Cloud provider stub (uses existing Supabase edge functions)
class CloudProvider implements ProcessingProvider {
  readonly mode = "cloud" as const;
  readonly capabilities = {
    stt: true,
    summarize: true,
    extract: true,
    offline: false,
  };

  async isReady(): Promise<boolean> {
    return true; // Cloud is always ready
  }

  async stt(input: any): Promise<any> {
    throw new Error("Cloud STT should use existing edge functions");
  }

  async summarize(input: any): Promise<any> {
    throw new Error("Cloud summarize should use existing edge functions");
  }

  async extract(input: any): Promise<any> {
    throw new Error("Cloud extract should use existing edge functions");
  }
}

// LAN provider stub (for Sprint L2)
class LANProvider implements ProcessingProvider {
  readonly mode = "local-lan" as const;
  readonly capabilities = {
    stt: true,
    summarize: true,
    extract: true,
    offline: false, // Requires LAN connection
  };

  private endpoint: string;

  constructor(config: ProviderConfig) {
    this.endpoint = config.lanEndpoint || "http://192.168.1.100:8000";
  }

  async initialize(): Promise<void> {
    console.log(`[LAN] Connecting to ${this.endpoint}...`);
    // TODO: Health check
  }

  async isReady(): Promise<boolean> {
    try {
      const response = await fetch(`${this.endpoint}/health`);
      return response.ok;
    } catch {
      return false;
    }
  }

  async stt(input: any): Promise<any> {
    const response = await fetch(`${this.endpoint}/stt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  }

  async summarize(input: any): Promise<any> {
    const response = await fetch(`${this.endpoint}/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  }

  async extract(input: any): Promise<any> {
    const response = await fetch(`${this.endpoint}/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    return response.json();
  }
}

/**
 * Create provider based on mode
 */
export function createProvider(config: ProviderConfig): ProcessingProvider {
  switch (config.mode) {
    case "cloud":
      return new CloudProvider();
    case "local-browser":
      return new LocalBrowserProvider(config);
    case "local-lan":
      return new LANProvider(config);
    default:
      throw new Error(`Unknown processing mode: ${config.mode}`);
  }
}

/**
 * Detect best available processing mode
 */
export async function detectBestMode(): Promise<ProcessingMode> {
  // Check if WebGPU is available
  const hasWebGPU = !!(navigator as any).gpu;

  // Check if sufficient RAM (heuristic via device memory)
  const deviceMemory = (navigator as any).deviceMemory as number | undefined;
  const hasSufficientRAM = !deviceMemory || deviceMemory >= 8;

  if (hasWebGPU && hasSufficientRAM) {
    return "local-browser";
  }

  // Default to cloud
  return "cloud";
}
