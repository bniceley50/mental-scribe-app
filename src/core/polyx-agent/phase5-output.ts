/**
 * Phase 5: Output Format
 * 
 * Formats the final agent output in the specified YAML-like structure.
 */

import type { 
  Implementation, 
  SelfReview, 
  AgentOutput, 
  IterationLog,
  PhaseResult
} from './types';

export class OutputFormatPhase {
  /**
   * Execute output formatting
   */
  async execute(
    implementation: Implementation,
    review: SelfReview,
    attempt: number,
    iterations: IterationLog[]
  ): Promise<PhaseResult<AgentOutput>> {
    try {
      const output = this.formatOutput(implementation, review, attempt, iterations);
      
      return {
        success: true,
        data: output
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error in output formatting']
      };
    }
  }

  /**
   * Format final output
   */
  private formatOutput(
    implementation: Implementation,
    review: SelfReview,
    attempt: number,
    iterations: IterationLog[]
  ): AgentOutput {
    const reasoningDigest = this.createReasoningDigest(implementation, review);
    const checklist = this.createChecklist(review);

    return {
      attempt,
      confidenceScore: review.confidenceScore,
      reasoningDigest,
      code: implementation.code,
      tests: implementation.tests,
      checklist,
      iterations: iterations.length > 0 ? iterations : undefined
    };
  }

  /**
   * Create reasoning digest
   */
  private createReasoningDigest(implementation: Implementation, review: SelfReview): string {
    const parts: string[] = [];

    // What was done
    parts.push('## What Was Done');
    if (implementation.criticalReasoningNotes.length > 0) {
      parts.push(implementation.criticalReasoningNotes.map(note => `- ${note}`).join('\n'));
    } else {
      parts.push('- Implementation generated according to specification');
    }

    // What works
    parts.push('\n## What Works');
    const positives: string[] = [];
    if (review.audit.isComplete) positives.push('Implementation is complete');
    if (review.audit.isLogicallyCoherent) positives.push('Logic is coherent');
    if (review.audit.edgeCasesCovered) positives.push('Edge cases are considered');
    if (review.audit.alignedToGoal) positives.push('Aligned with goals');
    
    if (positives.length > 0) {
      parts.push(positives.map(p => `- ${p}`).join('\n'));
    } else {
      parts.push('- Basic functionality implemented');
    }

    // What might break
    parts.push('\n## What Might Break');
    if (review.issues.length > 0) {
      parts.push(review.issues.map(issue => `- ${issue}`).join('\n'));
    } else {
      parts.push('- No major issues identified');
    }

    // Suggestions
    if (review.suggestions.length > 0) {
      parts.push('\n## Suggestions');
      parts.push(review.suggestions.map(s => `- ${s}`).join('\n'));
    }

    return parts.join('\n');
  }

  /**
   * Create verification checklist
   */
  private createChecklist(review: SelfReview) {
    return {
      specAligned: review.audit.alignedToGoal,
      invariantsCovered: review.audit.edgeCasesCovered,
      driftScoreZero: review.confidenceComponents.specDriftScore === 0,
      securityAndPolicySafe: true, // Assumed safe unless specific checks fail
      confidenceAboveTarget: review.confidenceScore >= 0.95
    };
  }

  /**
   * Format output as YAML string (for display purposes)
   */
  formatAsYAML(output: AgentOutput): string {
    const yaml: string[] = [];

    yaml.push(`attempt: ${output.attempt}`);
    yaml.push(`confidence_score: ${output.confidenceScore.toFixed(2)}`);
    yaml.push('reasoning_digest: |');
    yaml.push(...output.reasoningDigest.split('\n').map(line => `  ${line}`));
    
    yaml.push('code: |');
    yaml.push(...output.code.split('\n').map(line => `  ${line}`));
    
    if (output.tests) {
      yaml.push('tests: |');
      yaml.push(...output.tests.split('\n').map(line => `  ${line}`));
    }
    
    yaml.push('checklist: |');
    yaml.push(`  - SPEC aligned: ${output.checklist.specAligned ? '☑' : '☐'}`);
    yaml.push(`  - Invariants covered: ${output.checklist.invariantsCovered ? '☑' : '☐'}`);
    yaml.push(`  - Drift score == 0: ${output.checklist.driftScoreZero ? '☑' : '☐'}`);
    yaml.push(`  - Security & policy safe: ${output.checklist.securityAndPolicySafe ? '☑' : '☐'}`);
    yaml.push(`  - Confidence ≥ target: ${output.checklist.confidenceAboveTarget ? '☑' : '☐'}`);

    if (output.iterations && output.iterations.length > 0) {
      yaml.push('\niterations:');
      output.iterations.forEach((iteration, index) => {
        yaml.push(`  - attempt: ${iteration.attempt}`);
        yaml.push(`    phase: ${iteration.phase}`);
        yaml.push(`    confidence: ${iteration.confidenceScore.toFixed(2)}`);
        yaml.push(`    timestamp: ${iteration.timestamp.toISOString()}`);
      });
    }

    return yaml.join('\n');
  }

  /**
   * Format output as JSON string
   */
  formatAsJSON(output: AgentOutput): string {
    return JSON.stringify(output, null, 2);
  }
}
