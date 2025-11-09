/**
 * Local browser processing provider (STUB)
 * 
 * This is a stub implementation. After exporting the project, install:
 *   npm install @huggingface/transformers@3.3.1
 * 
 * Then replace this file with src/core/processing/providers/local-browser.ts
 */

import type {
  ProcessingProvider,
  ProcessingInput,
  STTOutput,
  SummarizeOutput,
  ExtractOutput,
  ProviderConfig,
} from "../types";

export class LocalBrowserProvider implements ProcessingProvider {
  readonly mode = "local-browser" as const;
  readonly capabilities = {
    stt: false, // Will be true after installing dependencies
    summarize: true, // Template-based (no dependencies needed)
    extract: true, // Rule-based (no dependencies needed)
    offline: true,
  };

  private modelSize: "tiny" | "base" | "small";

  constructor(config: ProviderConfig) {
    this.modelSize = config.modelSize || "base";
  }

  async initialize(): Promise<void> {
    console.warn(
      "[LocalBrowser] STUB MODE: Install @huggingface/transformers to enable local STT"
    );
    console.log(
      "Run: npm install @huggingface/transformers@3.3.1"
    );
  }

  async isReady(): Promise<boolean> {
    return false; // Not ready until dependencies installed
  }

  async stt(input: ProcessingInput): Promise<STTOutput> {
    throw new Error(
      "Local STT not available. Install @huggingface/transformers first."
    );
  }

  async summarize(input: {
    transcript: string;
    template: string;
  }): Promise<SummarizeOutput> {
    console.log("[LocalBrowser] Using template-based summarization...");

    const soap = this.templateBasedSOAP(input.transcript, input.template);
    return { soap };
  }

  async extract(input: { transcript: string }): Promise<ExtractOutput> {
    console.log("[LocalBrowser] Using rule-based extraction...");

    const entities = this.ruleBasedEntities(input.transcript);
    const risk = this.ruleBasedRisk(input.transcript);

    return { entities, risk };
  }

  async cleanup(): Promise<void> {
    console.log("[LocalBrowser] Cleanup complete");
  }

  /**
   * Template-based SOAP note generation (works without dependencies)
   */
  private templateBasedSOAP(
    transcript: string,
    template: string
  ): SummarizeOutput["soap"] {
    const lines = transcript.split("\n");

    const subjective = lines
      .filter((l) =>
        l.toLowerCase().match(/feel|said|reported|complain|concern/i)
      )
      .join(" ");

    const objective = lines
      .filter((l) => l.toLowerCase().match(/observe|appear|present|vital/i))
      .join(" ");

    const assessment = lines
      .filter((l) => l.toLowerCase().match(/diagnos|assess|impression/i))
      .join(" ");

    const plan = lines
      .filter((l) =>
        l.toLowerCase().match(/plan|recommend|prescrib|follow|referr/i)
      )
      .join(" ");

    return {
      subjective: subjective || "Patient reported concerns during session.",
      objective:
        objective || "Patient appeared cooperative during evaluation.",
      assessment: assessment || "Clinical assessment pending.",
      plan: plan || "Continue treatment plan as outlined.",
    };
  }

  /**
   * Rule-based entity extraction (works without dependencies)
   */
  private ruleBasedEntities(
    transcript: string
  ): ExtractOutput["entities"] {
    const entities: ExtractOutput["entities"] = [];

    // Extract medications
    const medicationRegex = /\b([A-Z][a-z]+(?:xr|xl|er)?)\s+\d+\s*mg\b/gi;
    const medications = transcript.match(medicationRegex) || [];
    entities.push(
      ...medications.map((med) => ({
        type: "medication",
        value: med,
        confidence: 0.8,
      }))
    );

    // Extract diagnoses
    const diagnosisTerms = [
      "depression",
      "anxiety",
      "PTSD",
      "bipolar",
      "schizophrenia",
      "ADHD",
    ];
    diagnosisTerms.forEach((term) => {
      if (transcript.toLowerCase().includes(term.toLowerCase())) {
        entities.push({
          type: "diagnosis",
          value: term,
          confidence: 0.7,
        });
      }
    });

    return entities;
  }

  /**
   * Rule-based risk assessment (works without dependencies)
   */
  private ruleBasedRisk(transcript: string): ExtractOutput["risk"] {
    const lowerTranscript = transcript.toLowerCase();

    const highRiskTerms = [
      "suicid",
      "kill myself",
      "end my life",
      "harm myself",
      "hurt myself",
    ];
    const mediumRiskTerms = [
      "hopeless",
      "no point",
      "can't go on",
      "overwhelming",
    ];

    const hasHighRisk = highRiskTerms.some((term) =>
      lowerTranscript.includes(term)
    );
    const hasMediumRisk = mediumRiskTerms.some((term) =>
      lowerTranscript.includes(term)
    );

    if (hasHighRisk) {
      return {
        level: "high",
        factors: [
          "Suicidal ideation detected",
          "Immediate safety assessment required",
        ],
      };
    }

    if (hasMediumRisk) {
      return {
        level: "medium",
        factors: ["Expressions of hopelessness", "Monitor closely"],
      };
    }

    return {
      level: "low",
      factors: ["No acute safety concerns identified"],
    };
  }
}
