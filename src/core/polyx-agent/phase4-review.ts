/**
 * Phase 4: Self-Review & Confidence Model
 * 
 * Evaluates implementation quality and calculates confidence score.
 */

import type { 
  Implementation, 
  StrategyPlan, 
  SelfReview, 
  ConfidenceComponents,
  PhaseResult,
  AgentConfig
} from './types';

export class SelfReviewPhase {
  /**
   * Execute self-review and confidence calculation
   */
  async execute(
    implementation: Implementation,
    plan: StrategyPlan,
    config: AgentConfig
  ): Promise<PhaseResult<SelfReview>> {
    try {
      const review = this.performReview(implementation, plan, config);
      
      return {
        success: true,
        data: review,
        warnings: review.confidenceScore < config.confidenceTarget
          ? [`Confidence score ${review.confidenceScore.toFixed(2)} below target ${config.confidenceTarget}`]
          : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error in self-review']
      };
    }
  }

  /**
   * Perform comprehensive review
   */
  private performReview(
    implementation: Implementation,
    plan: StrategyPlan,
    config: AgentConfig
  ): SelfReview {
    const components = this.calculateConfidenceComponents(implementation, plan, config);
    const confidenceScore = this.calculateConfidenceScore(components);
    const audit = this.performAudit(implementation, plan);
    const issues = this.identifyIssues(implementation, plan, components);
    const suggestions = this.generateSuggestions(implementation, plan, components);

    return {
      confidenceScore,
      confidenceComponents: components,
      audit,
      issues,
      suggestions
    };
  }

  /**
   * Calculate individual confidence components
   */
  private calculateConfidenceComponents(
    implementation: Implementation,
    plan: StrategyPlan,
    config: AgentConfig
  ): ConfidenceComponents {
    return {
      completeness: this.assessCompleteness(implementation, plan),
      logicCoherence: this.assessLogicCoherence(implementation),
      testCoverage: this.assessTestCoverage(implementation, config),
      domainFamiliarity: this.assessDomainFamiliarity(implementation, plan),
      simplicity: this.assessSimplicity(implementation, plan),
      specDriftScore: this.assessSpecDrift(implementation, plan)
    };
  }

  /**
   * Calculate overall confidence score
   * 
   * Formula: confidence = 0.25 * completeness + 0.25 * logic_coherence + 
   *                       0.20 * test_coverage + 0.15 * domain_familiarity +
   *                       0.15 * simplicity - 0.05 * spec_drift_score
   */
  private calculateConfidenceScore(components: ConfidenceComponents): number {
    const score = 
      0.25 * components.completeness +
      0.25 * components.logicCoherence +
      0.20 * components.testCoverage +
      0.15 * components.domainFamiliarity +
      0.15 * components.simplicity -
      0.05 * components.specDriftScore;

    return Math.max(0, Math.min(1, score)); // Clamp to [0, 1]
  }

  /**
   * Assess implementation completeness
   */
  private assessCompleteness(implementation: Implementation, plan: StrategyPlan): number {
    let score = 0.5; // Base score

    // Check if all components are addressed
    const hasCode = implementation.code.length > 0;
    const hasDocumentation = implementation.documentation !== undefined;
    const hasReasoning = implementation.criticalReasoningNotes.length > 0;

    if (hasCode) score += 0.3;
    if (hasDocumentation) score += 0.1;
    if (hasReasoning) score += 0.1;

    // Check for TODO markers (incomplete implementation)
    const todoCount = (implementation.code.match(/TODO/g) || []).length;
    if (todoCount > 0) {
      score -= Math.min(0.3, todoCount * 0.05);
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess logical coherence
   */
  private assessLogicCoherence(implementation: Implementation): number {
    let score = 0.8; // Assume good coherence by default

    // Check for basic syntax issues (simplified check)
    const hasBalancedBraces = this.checkBalancedBraces(implementation.code);
    if (!hasBalancedBraces) score -= 0.3;

    // Check for error handling
    const hasErrorHandling = implementation.code.includes('try') || 
                            implementation.code.includes('catch') ||
                            implementation.code.includes('throw');
    if (hasErrorHandling) score += 0.1;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess test coverage
   */
  private assessTestCoverage(implementation: Implementation, config: AgentConfig): number {
    if (config.mode === 'fast') {
      return 0.5; // Lower expectation in fast mode
    }

    if (!implementation.tests) {
      return 0.1; // Very low score without tests
    }

    let score = 0.5; // Base score for having tests

    // Count test cases
    const testCount = (implementation.tests.match(/it\(/g) || []).length;
    score += Math.min(0.3, testCount * 0.05);

    // Check for edge case tests
    if (implementation.tests.includes('edge case') || implementation.tests.includes('Edge cases')) {
      score += 0.1;
    }

    // Check for error handling tests
    if (implementation.tests.includes('error') || implementation.tests.includes('Error handling')) {
      score += 0.1;
    }

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess domain familiarity
   */
  private assessDomainFamiliarity(implementation: Implementation, plan: StrategyPlan): number {
    // High complexity components indicate less familiarity
    const highComplexityCount = plan.components.filter(c => c.complexity === 'high').length;
    const totalComponents = plan.components.length;

    if (totalComponents === 0) return 0.5;

    const complexityRatio = highComplexityCount / totalComponents;
    return Math.max(0.3, 1.0 - complexityRatio);
  }

  /**
   * Assess simplicity
   */
  private assessSimplicity(implementation: Implementation, plan: StrategyPlan): number {
    let score = 1.0;

    // Check code length (longer = more complex)
    const codeLength = implementation.code.length;
    if (codeLength > 5000) score -= 0.2;
    if (codeLength > 10000) score -= 0.3;

    // Check component count
    if (plan.components.length > 5) score -= 0.2;

    // Check failure points
    if (plan.failurePoints.length > 5) score -= 0.2;

    return Math.max(0, Math.min(1, score));
  }

  /**
   * Assess specification drift
   */
  private assessSpecDrift(implementation: Implementation, plan: StrategyPlan): number {
    // In this simplified version, we assume no drift
    // A full implementation would compare against original spec
    
    // Check for warning signs of drift
    let driftScore = 0.0;

    // Too many critical reasoning notes might indicate complexity beyond spec
    if (implementation.criticalReasoningNotes.length > 5) {
      driftScore += 0.3;
    }

    // Large number of edge cases might indicate scope creep
    if (plan.edgeCases.length > 10) {
      driftScore += 0.2;
    }

    return Math.max(0, Math.min(1, driftScore));
  }

  /**
   * Perform comprehensive audit
   */
  private performAudit(implementation: Implementation, plan: StrategyPlan) {
    return {
      isComplete: !implementation.code.includes('TODO') && implementation.code.length > 100,
      isLogicallyCoherent: this.checkBalancedBraces(implementation.code),
      edgeCasesCovered: plan.edgeCases.length > 0,
      alignedToGoal: implementation.criticalReasoningNotes.length > 0
    };
  }

  /**
   * Identify issues
   */
  private identifyIssues(
    implementation: Implementation,
    plan: StrategyPlan,
    components: ConfidenceComponents
  ): string[] {
    const issues: string[] = [];

    if (components.completeness < 0.7) {
      issues.push('Implementation appears incomplete');
    }

    if (components.testCoverage < 0.5) {
      issues.push('Test coverage is insufficient');
    }

    if (components.specDriftScore > 0.3) {
      issues.push('Potential specification drift detected');
    }

    if (!implementation.tests) {
      issues.push('No tests provided');
    }

    const todoCount = (implementation.code.match(/TODO/g) || []).length;
    if (todoCount > 0) {
      issues.push(`${todoCount} TODO items remaining in code`);
    }

    return issues;
  }

  /**
   * Generate improvement suggestions
   */
  private generateSuggestions(
    implementation: Implementation,
    plan: StrategyPlan,
    components: ConfidenceComponents
  ): string[] {
    const suggestions: string[] = [];

    if (components.testCoverage < 0.8) {
      suggestions.push('Add more comprehensive test coverage');
    }

    if (components.simplicity < 0.6) {
      suggestions.push('Consider simplifying the implementation');
    }

    if (plan.failurePoints.length > 5) {
      suggestions.push('Address high-risk failure points before finalizing');
    }

    if (!implementation.documentation) {
      suggestions.push('Add documentation for better maintainability');
    }

    return suggestions;
  }

  /**
   * Check if braces are balanced
   */
  private checkBalancedBraces(code: string): boolean {
    let count = 0;
    for (const char of code) {
      if (char === '{') count++;
      if (char === '}') count--;
      if (count < 0) return false;
    }
    return count === 0;
  }
}
