/**
 * Local-first processing types
 * Abstraction for Cloud vs Local vs LAN processing modes
 */

export type ProcessingMode = "cloud" | "local-browser" | "local-lan";

export interface ProcessingInput {
  audioBlob?: Blob;
  text?: string;
  settings?: Record<string, unknown>;
}

export interface STTOutput {
  transcript: string;
  segments?: Array<{
    text: string;
    start: number;
    end: number;
  }>;
  language?: string;
}

export interface SummarizeOutput {
  soap: {
    subjective?: string;
    objective?: string;
    assessment?: string;
    plan?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface ExtractOutput {
  entities: Array<{
    type: string;
    value: string;
    confidence?: number;
  }>;
  risk: {
    level: "low" | "medium" | "high";
    factors: string[];
  };
}

/**
 * Processing provider interface - all implementations must support this
 */
export interface ProcessingProvider {
  readonly mode: ProcessingMode;
  readonly capabilities: {
    stt: boolean;
    summarize: boolean;
    extract: boolean;
    offline: boolean;
  };

  /**
   * Speech-to-text transcription
   */
  stt(input: ProcessingInput): Promise<STTOutput>;

  /**
   * Summarize transcript into structured format (SOAP, etc.)
   */
  summarize(input: {
    transcript: string;
    template: string;
  }): Promise<SummarizeOutput>;

  /**
   * Extract entities and risk assessment from transcript
   */
  extract(input: { transcript: string }): Promise<ExtractOutput>;

  /**
   * Check if provider is ready to process
   */
  isReady(): Promise<boolean>;

  /**
   * Initialize provider (download models, etc.)
   */
  initialize?(): Promise<void>;

  /**
   * Cleanup resources
   */
  cleanup?(): Promise<void>;
}

/**
 * Provider configuration
 */
export interface ProviderConfig {
  mode: ProcessingMode;
  // Cloud-specific
  cloudEndpoint?: string;
  // LAN-specific
  lanEndpoint?: string;
  lanTimeout?: number;
  // Browser-specific
  useWebGPU?: boolean;
  modelSize?: "tiny" | "base" | "small";
}
