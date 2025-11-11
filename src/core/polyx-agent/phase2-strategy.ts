/**
 * Phase 2: Strategy Planning
 * 
 * Breaks down the task into components and creates an execution plan.
 */

import type { TaskSpec, ProblemAnalysis, StrategyPlan, PlanComponent, PhaseResult } from './types';

export class StrategyPlanningPhase {
  /**
   * Execute strategy planning
   */
  async execute(task: TaskSpec, analysis: ProblemAnalysis): Promise<PhaseResult<StrategyPlan>> {
    try {
      const plan = this.createPlan(task, analysis);
      
      return {
        success: true,
        data: plan,
        warnings: plan.failurePoints.length > 5 
          ? ['High number of potential failure points identified']
          : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error in strategy planning']
      };
    }
  }

  /**
   * Create execution plan from task and analysis
   */
  private createPlan(task: TaskSpec, analysis: ProblemAnalysis): StrategyPlan {
    const components = this.identifyComponents(task, analysis);
    const rankedComponents = this.rankByComplexity(components);
    const edgeCases = this.predictEdgeCases(task, analysis);
    const failurePoints = this.predictFailurePoints(task, analysis, rankedComponents);

    return {
      components: rankedComponents,
      edgeCases,
      failurePoints
    };
  }

  /**
   * Identify components/modules needed
   */
  private identifyComponents(task: TaskSpec, analysis: ProblemAnalysis): PlanComponent[] {
    const components: PlanComponent[] = [];
    
    // Core implementation component
    components.push({
      name: 'Core Implementation',
      description: 'Main logic implementation',
      complexity: 'medium',
      dependencies: [],
      order: 1
    });

    // If testing is mentioned or required
    if (task.description.toLowerCase().includes('test') || 
        task.requirements?.some(r => r.toLowerCase().includes('test'))) {
      components.push({
        name: 'Test Suite',
        description: 'Unit and integration tests',
        complexity: 'medium',
        dependencies: ['Core Implementation'],
        order: 2
      });
    }

    // If documentation is needed
    if (task.description.toLowerCase().includes('document') || 
        task.requirements?.some(r => r.toLowerCase().includes('document'))) {
      components.push({
        name: 'Documentation',
        description: 'Code documentation and usage examples',
        complexity: 'low',
        dependencies: ['Core Implementation'],
        order: 3
      });
    }

    // If validation is needed
    if (task.requirements?.some(r => r.toLowerCase().includes('validat'))) {
      components.push({
        name: 'Input Validation',
        description: 'Validate inputs and handle errors',
        complexity: 'low',
        dependencies: [],
        order: 0
      });
    }

    return components;
  }

  /**
   * Rank components by complexity and dependencies
   */
  private rankByComplexity(components: PlanComponent[]): PlanComponent[] {
    // Sort by order (which considers dependencies) and then by complexity
    return [...components].sort((a, b) => {
      if (a.order !== b.order) {
        return a.order - b.order;
      }
      
      const complexityWeight = { low: 1, medium: 2, high: 3 };
      return complexityWeight[a.complexity] - complexityWeight[b.complexity];
    });
  }

  /**
   * Predict edge cases
   */
  private predictEdgeCases(task: TaskSpec, analysis: ProblemAnalysis): string[] {
    const edgeCases: string[] = [];
    const description = task.description.toLowerCase();

    // Common edge cases
    edgeCases.push('Empty or null input');
    edgeCases.push('Invalid input format');
    
    // Data-related edge cases
    if (description.includes('array') || description.includes('list')) {
      edgeCases.push('Empty array');
      edgeCases.push('Single-element array');
      edgeCases.push('Very large array (performance)');
    }

    if (description.includes('string') || description.includes('text')) {
      edgeCases.push('Empty string');
      edgeCases.push('Very long string');
      edgeCases.push('Special characters and unicode');
    }

    if (description.includes('number') || description.includes('numeric')) {
      edgeCases.push('Zero value');
      edgeCases.push('Negative values');
      edgeCases.push('Very large numbers');
      edgeCases.push('Floating point precision');
    }

    // Async/concurrent edge cases
    if (description.includes('async') || description.includes('concurrent')) {
      edgeCases.push('Race conditions');
      edgeCases.push('Timeout scenarios');
      edgeCases.push('Error handling in async operations');
    }

    return edgeCases;
  }

  /**
   * Predict likely failure points
   */
  private predictFailurePoints(
    task: TaskSpec, 
    analysis: ProblemAnalysis, 
    components: PlanComponent[]
  ): string[] {
    const failurePoints: string[] = [];

    // Ambiguities can lead to failures
    if (analysis.ambiguities.length > 0) {
      failurePoints.push('Ambiguous requirements may lead to incorrect implementation');
    }

    // Complex components are more likely to fail
    const highComplexityComponents = components.filter(c => c.complexity === 'high');
    if (highComplexityComponents.length > 0) {
      highComplexityComponents.forEach(c => {
        failurePoints.push(`High complexity in: ${c.name}`);
      });
    }

    // Dependencies can cause cascading failures
    const componentsWithDeps = components.filter(c => c.dependencies.length > 0);
    if (componentsWithDeps.length > 2) {
      failurePoints.push('Multiple dependencies increase risk of cascading failures');
    }

    // Missing test coverage
    const hasTestComponent = components.some(c => c.name.toLowerCase().includes('test'));
    if (!hasTestComponent) {
      failurePoints.push('No test component identified - increased risk of undetected bugs');
    }

    // Unknown factors
    if (analysis.unknowns.length > 3) {
      failurePoints.push('High number of unknowns may lead to incomplete implementation');
    }

    return failurePoints;
  }
}
