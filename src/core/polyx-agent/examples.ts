/**
 * Example usage of PolyX Supreme v1.0 Agent
 * 
 * This file demonstrates how to use the autonomous coding agent
 * in different scenarios.
 */

import { PolyXAgent, type AgentOutput } from './index';
import type { TaskSpec, AgentConfig } from './types';

/**
 * Example 1: Simple task with fast mode
 */
export async function example1SimpleTask(): Promise<void> {
  const result = await PolyXAgent.activate({
    task: 'Create a function that reverses a string',
    requirements: [
      'Handle empty strings',
      'Preserve unicode characters'
    ],
    mode: 'fast',
    confidenceTarget: 0.80
  });

  if ('code' in result) {
    // Success
  } else {
    // Error
  }
}

/**
 * Example 2: Complex task with verified mode
 */
export async function example2ComplexTask(): Promise<void> {
  const task: TaskSpec = {
    description: 'Implement a tokenizer that splits input text into lowercase alphanumeric tokens',
    requirements: [
      'Remove all punctuation',
      'Convert to lowercase',
      'Split on whitespace',
      'Handle multiple consecutive spaces'
    ],
    constraints: [
      'No external dependencies',
      'Optimize for performance'
    ]
  };

  const config: AgentConfig = {
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 2
  };

  const agent = new PolyXAgent();
  const result = await agent.execute(task, config);

  if ('code' in result) {
    // Analyze the result
    if (result.confidenceScore >= 0.95) {
      // High confidence - ready to use
    } else {
      // Lower confidence - may need review
    }
  }
}

/**
 * Example 3: Using the agent for clinical documentation
 */
export async function example3ClinicalTemplate(): Promise<void> {
  const result = await PolyXAgent.activate({
    task: 'Generate a validation function for clinical notes',
    requirements: [
      'Validate required fields are present',
      'Check for minimum note length',
      'Ensure timestamp is valid',
      'Return detailed validation errors'
    ],
    constraints: [
      'Follow HIPAA guidelines',
      'No PII in error messages'
    ],
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 3
  });

  if ('code' in result) {
    // Implementation ready
  }
}

/**
 * Example 4: Iterative refinement
 */
export async function example4IterativeRefinement(): Promise<AgentOutput | { error: string }> {
  const agent = new PolyXAgent();
  
  let result = await agent.execute(
    {
      description: 'Create a data transformation pipeline',
      requirements: [
        'Transform input data structure',
        'Validate data integrity',
        'Handle errors gracefully'
      ]
    },
    {
      mode: 'verified',
      confidenceTarget: 0.90,
      maxRetries: 3
    }
  );

  // Check if iterations occurred
  if ('iterations' in result && result.iterations) {
    // Review iteration history
  }

  return result;
}

/**
 * Example 5: Output formatting
 */
export async function example5OutputFormatting(): Promise<void> {
  const { OutputFormatPhase } = await import('./phase5-output');
  
  const result = await PolyXAgent.activate({
    task: 'Simple formatting example',
    mode: 'fast',
    confidenceTarget: 0.70
  });

  if ('code' in result) {
    const formatter = new OutputFormatPhase();
    
    // Get YAML format
    const yaml = formatter.formatAsYAML(result);
    
    // Get JSON format
    const json = formatter.formatAsJSON(result);
  }
}
