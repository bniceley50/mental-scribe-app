/**
 * PolyX Supreme v1.0 - Main Agent Orchestrator
 * 
 * Autonomous coding agent with recursive reasoning capabilities.
 * Coordinates all 5 phases of the agent workflow.
 */

import type { 
  TaskSpec, 
  AgentConfig, 
  AgentOutput, 
  AgentContext,
  IterationLog
} from './types';
import { ProblemDeconstructionPhase } from './phase1-deconstruction';
import { StrategyPlanningPhase } from './phase2-strategy';
import { ImplementationPhase } from './phase3-implementation';
import { SelfReviewPhase } from './phase4-review';
import { OutputFormatPhase } from './phase5-output';

export class PolyXAgent {
  private phase1: ProblemDeconstructionPhase;
  private phase2: StrategyPlanningPhase;
  private phase3: ImplementationPhase;
  private phase4: SelfReviewPhase;
  private phase5: OutputFormatPhase;

  constructor() {
    this.phase1 = new ProblemDeconstructionPhase();
    this.phase2 = new StrategyPlanningPhase();
    this.phase3 = new ImplementationPhase();
    this.phase4 = new SelfReviewPhase();
    this.phase5 = new OutputFormatPhase();
  }

  /**
   * Execute the agent with a given task
   * 
   * @param task - Task specification
   * @param config - Agent configuration
   * @returns Final output or error
   */
  async execute(task: TaskSpec, config: AgentConfig): Promise<AgentOutput | { error: string }> {
    const context: AgentContext = {
      task,
      config,
      iterations: [],
      currentAttempt: 1
    };

    // Recursive execution with retry logic
    return await this.executeWithRetry(context);
  }

  /**
   * Execute agent with retry logic
   */
  private async executeWithRetry(context: AgentContext): Promise<AgentOutput | { error: string }> {
    while (context.currentAttempt <= context.config.maxRetries) {
      try {
        const result = await this.executeSingleAttempt(context);

        // Check if confidence is sufficient
        if (result.confidenceScore >= context.config.confidenceTarget && 
            result.checklist.driftScoreZero) {
          return result;
        }

        // Log iteration
        const iterationLog: IterationLog = {
          attempt: context.currentAttempt,
          phase: 'Complete',
          confidenceScore: result.confidenceScore,
          issues: result.checklist.confidenceAboveTarget ? [] : ['Confidence below target'],
          actions: ['Retrying with refined approach'],
          timestamp: new Date()
        };
        context.iterations.push(iterationLog);

        // Prepare for retry
        context.currentAttempt++;

        // If this was the last attempt, return what we have
        if (context.currentAttempt > context.config.maxRetries) {
          return result;
        }

      } catch (error) {
        return {
          error: error instanceof Error ? error.message : 'Unknown error during agent execution'
        };
      }
    }

    return { error: 'Maximum retries exceeded without reaching confidence target' };
  }

  /**
   * Execute a single attempt through all phases
   */
  private async executeSingleAttempt(context: AgentContext): Promise<AgentOutput> {
    // PHASE 1: Problem Deconstruction
    const phase1Result = await this.phase1.execute(context.task);
    if (!phase1Result.success || !phase1Result.data) {
      throw new Error(`Phase 1 failed: ${phase1Result.errors?.join(', ')}`);
    }

    // Check if clarification is needed
    if (phase1Result.data.needsClarification) {
      // In a real implementation, this would request user input
      // For now, we proceed with warnings
    }

    this.logPhase(context, 'Problem Deconstruction', phase1Result.warnings);

    // PHASE 2: Strategy Planning
    const phase2Result = await this.phase2.execute(context.task, phase1Result.data);
    if (!phase2Result.success || !phase2Result.data) {
      throw new Error(`Phase 2 failed: ${phase2Result.errors?.join(', ')}`);
    }

    this.logPhase(context, 'Strategy Planning', phase2Result.warnings);

    // PHASE 3: Implementation
    const phase3Result = await this.phase3.execute(
      context.task,
      phase2Result.data,
      context.config
    );
    if (!phase3Result.success || !phase3Result.data) {
      throw new Error(`Phase 3 failed: ${phase3Result.errors?.join(', ')}`);
    }

    this.logPhase(context, 'Implementation', phase3Result.warnings);

    // PHASE 4: Self-Review & Confidence
    const phase4Result = await this.phase4.execute(
      phase3Result.data,
      phase2Result.data,
      context.config
    );
    if (!phase4Result.success || !phase4Result.data) {
      throw new Error(`Phase 4 failed: ${phase4Result.errors?.join(', ')}`);
    }

    this.logPhase(context, 'Self-Review', phase4Result.warnings);

    // PHASE 5: Output Format
    const phase5Result = await this.phase5.execute(
      phase3Result.data,
      phase4Result.data,
      context.currentAttempt,
      context.iterations
    );
    if (!phase5Result.success || !phase5Result.data) {
      throw new Error(`Phase 5 failed: ${phase5Result.errors?.join(', ')}`);
    }

    return phase5Result.data;
  }

  /**
   * Log phase completion
   */
  private logPhase(context: AgentContext, phaseName: string, warnings?: string[]): void {
    if (warnings && warnings.length > 0) {
      const iterationLog: IterationLog = {
        attempt: context.currentAttempt,
        phase: phaseName,
        confidenceScore: 0, // Not yet calculated
        issues: warnings,
        actions: [],
        timestamp: new Date()
      };
      context.iterations.push(iterationLog);
    }
  }

  /**
   * Activate the agent shell (convenience method for CLI-like usage)
   */
  static async activate(options: {
    task: string;
    requirements?: string[];
    constraints?: string[];
    mode?: 'verified' | 'fast';
    confidenceTarget?: number;
    maxRetries?: number;
  }): Promise<AgentOutput | { error: string }> {
    const task: TaskSpec = {
      description: options.task,
      requirements: options.requirements,
      constraints: options.constraints
    };

    const config: AgentConfig = {
      mode: options.mode || 'verified',
      confidenceTarget: options.confidenceTarget || 0.95,
      maxRetries: options.maxRetries || 2
    };

    const agent = new PolyXAgent();
    return await agent.execute(task, config);
  }
}

// Export for direct usage
export { OutputFormatPhase } from './phase5-output';
export type * from './types';
