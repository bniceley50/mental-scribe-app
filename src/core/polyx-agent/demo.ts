/**
 * PolyX Supreme v1.0 - Interactive Demo
 * 
 * This file demonstrates the agent executing a real task and shows
 * the complete workflow from problem to solution.
 */

import { PolyXAgent, OutputFormatPhase } from './index';

/**
 * Demo: Tokenizer Implementation
 * 
 * This demonstrates the agent solving the exact example from the spec:
 * "Implement a tokenizer that splits input text into lowercase alphanumeric tokens, 
 *  removing all punctuation."
 */
async function demoTokenizer() {
  // Activate agent with the specification
  const result = await PolyXAgent.activate({
    task: 'Implement a tokenizer that splits input text into lowercase alphanumeric tokens, removing all punctuation',
    requirements: [
      'Convert all text to lowercase',
      'Remove all punctuation characters',
      'Split on whitespace',
      'Return array of alphanumeric tokens',
      'Handle edge cases (empty strings, multiple spaces, etc.)'
    ],
    constraints: [
      'No external dependencies',
      'Optimize for readability',
      'Include error handling'
    ],
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 2
  });

  // Check if successful
  if ('error' in result) {
    return result;
  }

  // Format output for display
  const formatter = new OutputFormatPhase();
  const yaml = formatter.formatAsYAML(result);

  return {
    success: true,
    result,
    yaml,
    summary: {
      attempt: result.attempt,
      confidence: result.confidenceScore,
      hasCode: !!result.code,
      hasTests: !!result.tests,
      checklistPassed: Object.values(result.checklist).every(v => v === true)
    }
  };
}

/**
 * Demo: Clinical Note Validator
 * 
 * This demonstrates using the agent for Mental Scribe-specific tasks
 */
async function demoClinicalValidator() {
  const result = await PolyXAgent.activate({
    task: 'Create a comprehensive clinical note validator',
    requirements: [
      'Validate required fields: patientId, sessionDate, clinicianId, noteContent',
      'Check minimum note length (100 characters)',
      'Validate date is not in future',
      'Ensure noteContent contains no PII patterns',
      'Return ValidationResult with specific error messages',
      'Support both synchronous and async validation'
    ],
    constraints: [
      'HIPAA-compliant error messages',
      'No PII in logs or errors',
      'TypeScript with strict types',
      'Follow Mental Scribe patterns'
    ],
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 3
  });

  if ('error' in result) {
    return result;
  }

  return {
    success: true,
    confidence: result.confidenceScore,
    checklist: result.checklist,
    reasoningDigest: result.reasoningDigest
  };
}

/**
 * Demo: Comparison of Modes
 * 
 * Shows the difference between fast and verified modes
 */
async function demoModeComparison() {
  const simpleTask = {
    task: 'Create a function to capitalize the first letter of each word',
    requirements: ['Handle empty strings', 'Preserve spacing']
  };

  // Fast mode
  const fastResult = await PolyXAgent.activate({
    ...simpleTask,
    mode: 'fast',
    confidenceTarget: 0.80,
    maxRetries: 1
  });

  // Verified mode
  const verifiedResult = await PolyXAgent.activate({
    ...simpleTask,
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 2
  });

  return {
    fast: 'error' in fastResult ? null : {
      confidence: fastResult.confidenceScore,
      hasTests: !!fastResult.tests,
      attempt: fastResult.attempt
    },
    verified: 'error' in verifiedResult ? null : {
      confidence: verifiedResult.confidenceScore,
      hasTests: !!verifiedResult.tests,
      attempt: verifiedResult.attempt
    }
  };
}

/**
 * Demo: Iterative Refinement
 * 
 * Shows how the agent improves through iterations when confidence is low
 */
async function demoIterativeRefinement() {
  const result = await PolyXAgent.activate({
    task: 'Build a complex data transformation pipeline with validation',
    requirements: [
      'Transform nested JSON structures',
      'Validate data at each step',
      'Handle circular references',
      'Support async transformations',
      'Provide detailed error context'
    ],
    mode: 'verified',
    confidenceTarget: 0.95,
    maxRetries: 3
  });

  if ('error' in result) {
    return result;
  }

  return {
    finalAttempt: result.attempt,
    finalConfidence: result.confidenceScore,
    iterations: result.iterations || [],
    metTarget: result.checklist.confidenceAboveTarget
  };
}

// Export demos for testing and demonstration
export const demos = {
  tokenizer: demoTokenizer,
  clinicalValidator: demoClinicalValidator,
  modeComparison: demoModeComparison,
  iterativeRefinement: demoIterativeRefinement
};

// Example usage (commented out to avoid execution on import)
// To run demos, uncomment and use the logger utility:
/*
import { logger } from '@/lib/logger';

async function runDemo() {
  logger.info('=== PolyX Supreme v1.0 Demo ===\n');
  
  logger.info('1. Tokenizer Demo');
  const tokenizerResult = await demoTokenizer();
  logger.info(JSON.stringify(tokenizerResult.summary, null, 2));
  logger.info('\nYAML Output:\n', tokenizerResult.yaml);
  
  logger.info('\n2. Clinical Validator Demo');
  const validatorResult = await demoClinicalValidator();
  logger.info(JSON.stringify(validatorResult, null, 2));
  
  logger.info('\n3. Mode Comparison Demo');
  const comparisonResult = await demoModeComparison();
  logger.info(JSON.stringify(comparisonResult, null, 2));
  
  logger.info('\n4. Iterative Refinement Demo');
  const refinementResult = await demoIterativeRefinement();
  logger.info(JSON.stringify(refinementResult, null, 2));
}
*/
