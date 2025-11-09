/**
 * Local-first processing core
 * Main exports for the processing module
 */

export * from "./types";
export * from "./factory";
export { LocalBrowserProvider } from "./providers/local-browser-stub";

// Re-export network guard
export { 
  setProcessingMode, 
  getProcessingMode, 
  guardedFetch, 
  getNetworkStatusBadge 
} from "../network/guard";

// Re-export crypto
export * from "../crypto/vault";

// Re-export storage
export * from "../storage/database-stub";
