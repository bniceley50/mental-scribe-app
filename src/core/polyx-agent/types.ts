/**
 * PolyX Supreme v1.0 - Autonomous Coding Agent Types
 * 
 * Core type definitions for the recursive reasoning agent framework.
 */

/**
 * Confidence score components for self-assessment
 */
export interface ConfidenceComponents {
  completeness: number;        // 0.0 - 1.0
  logicCoherence: number;       // 0.0 - 1.0
  testCoverage: number;         // 0.0 - 1.0
  domainFamiliarity: number;    // 0.0 - 1.0
  simplicity: number;           // 0.0 - 1.0
  specDriftScore: number;       // 0.0 - 1.0 (0 = no drift)
}

/**
 * Configuration for the agent
 */
export interface AgentConfig {
  mode: 'verified' | 'fast';
  confidenceTarget: number;     // 0.0 - 1.0, typically 0.95
  maxRetries: number;           // Maximum retry attempts
}

/**
 * Task specification
 */
export interface TaskSpec {
  description: string;
  requirements?: string[];
  constraints?: string[];
  context?: Record<string, unknown>;
}

/**
 * Problem analysis from Phase 1
 */
export interface ProblemAnalysis {
  restatement: string;
  knowns: string[];
  unknowns: string[];
  assumptions: string[];
  ambiguities: string[];
  needsClarification: boolean;
}

/**
 * Strategy plan from Phase 2
 */
export interface StrategyPlan {
  components: PlanComponent[];
  edgeCases: string[];
  failurePoints: string[];
}

export interface PlanComponent {
  name: string;
  description: string;
  complexity: 'low' | 'medium' | 'high';
  dependencies: string[];
  order: number;
}

/**
 * Implementation result from Phase 3
 */
export interface Implementation {
  code: string;
  tests?: string;
  documentation?: string;
  criticalReasoningNotes: string[];
}

/**
 * Self-review result from Phase 4
 */
export interface SelfReview {
  confidenceScore: number;
  confidenceComponents: ConfidenceComponents;
  audit: {
    isComplete: boolean;
    isLogicallyCoherent: boolean;
    edgeCasesCovered: boolean;
    alignedToGoal: boolean;
  };
  issues: string[];
  suggestions: string[];
}

/**
 * Final output format from Phase 5
 */
export interface AgentOutput {
  attempt: number;
  confidenceScore: number;
  reasoningDigest: string;
  code: string;
  tests?: string;
  checklist: {
    specAligned: boolean;
    invariantsCovered: boolean;
    driftScoreZero: boolean;
    securityAndPolicySafe: boolean;
    confidenceAboveTarget: boolean;
  };
  iterations?: IterationLog[];
}

/**
 * Log entry for each iteration
 */
export interface IterationLog {
  attempt: number;
  phase: string;
  confidenceScore: number;
  issues: string[];
  actions: string[];
  timestamp: Date;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  task: TaskSpec;
  config: AgentConfig;
  iterations: IterationLog[];
  currentAttempt: number;
}

/**
 * Phase execution result
 */
export interface PhaseResult<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  warnings?: string[];
}
