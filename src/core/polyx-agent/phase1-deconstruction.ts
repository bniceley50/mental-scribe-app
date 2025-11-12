/**
 * Phase 1: Problem Deconstruction
 * 
 * Analyzes and deconstructs the problem statement to ensure complete understanding.
 */

import type { TaskSpec, ProblemAnalysis, PhaseResult } from './types';

export class ProblemDeconstructionPhase {
  /**
   * Execute problem deconstruction analysis
   */
  async execute(task: TaskSpec): Promise<PhaseResult<ProblemAnalysis>> {
    try {
      const analysis = this.analyzeTask(task);
      
      // Check if clarification is needed
      if (analysis.ambiguities.length > 0 || analysis.unknowns.length > 5) {
        analysis.needsClarification = true;
      }

      return {
        success: true,
        data: analysis,
        warnings: analysis.needsClarification 
          ? ['Task contains ambiguities that may require clarification']
          : undefined
      };
    } catch (error) {
      return {
        success: false,
        errors: [error instanceof Error ? error.message : 'Unknown error in problem deconstruction']
      };
    }
  }

  /**
   * Analyze the task and extract key information
   */
  private analyzeTask(task: TaskSpec): ProblemAnalysis {
    const restatement = this.restateTask(task);
    const knowns = this.extractKnowns(task);
    const unknowns = this.extractUnknowns(task);
    const assumptions = this.extractAssumptions(task);
    const ambiguities = this.detectAmbiguities(task);

    return {
      restatement,
      knowns,
      unknowns,
      assumptions,
      ambiguities,
      needsClarification: false
    };
  }

  /**
   * Restate the task in clear terms
   */
  private restateTask(task: TaskSpec): string {
    // Extract key actions and objectives from the description
    const description = task.description.toLowerCase();
    
    let restatement = `Task: ${task.description}\n\n`;
    
    if (task.requirements && task.requirements.length > 0) {
      restatement += `Requirements:\n${task.requirements.map(r => `- ${r}`).join('\n')}\n\n`;
    }
    
    if (task.constraints && task.constraints.length > 0) {
      restatement += `Constraints:\n${task.constraints.map(c => `- ${c}`).join('\n')}`;
    }
    
    return restatement.trim();
  }

  /**
   * Extract known information from the task
   */
  private extractKnowns(task: TaskSpec): string[] {
    const knowns: string[] = [];
    
    // Add explicit requirements as knowns
    if (task.requirements) {
      knowns.push(...task.requirements.map(r => `Requirement: ${r}`));
    }
    
    // Add constraints as knowns
    if (task.constraints) {
      knowns.push(...task.constraints.map(c => `Constraint: ${c}`));
    }
    
    // Extract context items
    if (task.context) {
      Object.entries(task.context).forEach(([key, value]) => {
        knowns.push(`${key}: ${String(value)}`);
      });
    }
    
    return knowns;
  }

  /**
   * Identify unknown aspects that need resolution
   */
  private extractUnknowns(task: TaskSpec): string[] {
    const unknowns: string[] = [];
    const description = task.description.toLowerCase();
    
    // Check for implementation details
    if (!task.requirements || task.requirements.length === 0) {
      unknowns.push('Specific implementation requirements not provided');
    }
    
    // Check for performance criteria
    if (!description.includes('performance') && !task.requirements?.some(r => r.toLowerCase().includes('performance'))) {
      unknowns.push('Performance criteria not specified');
    }
    
    // Check for testing requirements
    if (!description.includes('test') && !task.requirements?.some(r => r.toLowerCase().includes('test'))) {
      unknowns.push('Testing requirements not explicitly stated');
    }
    
    return unknowns;
  }

  /**
   * Identify assumptions being made
   */
  private extractAssumptions(task: TaskSpec): string[] {
    const assumptions: string[] = [];
    
    assumptions.push('Task description is complete and accurate');
    assumptions.push('Implementation should follow best practices');
    
    if (!task.constraints || task.constraints.length === 0) {
      assumptions.push('No specific constraints on implementation approach');
    }
    
    if (task.context) {
      assumptions.push('Provided context is current and valid');
    }
    
    return assumptions;
  }

  /**
   * Detect ambiguities in the task specification
   */
  private detectAmbiguities(task: TaskSpec): string[] {
    const ambiguities: string[] = [];
    const description = task.description;
    
    // Check for vague terms
    const vagueTerms = ['should', 'might', 'could', 'maybe', 'probably', 'approximately'];
    vagueTerms.forEach(term => {
      if (description.toLowerCase().includes(term)) {
        ambiguities.push(`Vague term detected: "${term}"`);
      }
    });
    
    // Check for conflicting requirements
    if (task.requirements && task.requirements.length > 1) {
      // Simple heuristic: look for contradictory keywords
      const hasSpeed = task.requirements.some(r => r.toLowerCase().includes('fast') || r.toLowerCase().includes('quick'));
      const hasQuality = task.requirements.some(r => r.toLowerCase().includes('robust') || r.toLowerCase().includes('thorough'));
      
      if (hasSpeed && hasQuality) {
        ambiguities.push('Potential conflict between speed and thoroughness requirements');
      }
    }
    
    return ambiguities;
  }
}
