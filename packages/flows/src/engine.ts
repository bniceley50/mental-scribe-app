import { Observable, from, of, concat } from 'rxjs';
import { MScribeEvent, createEvent } from '@mscribe/events';

/**
 * Status of a flow step execution
 */
export type StepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

/**
 * Context passed between flow steps
 */
export interface FlowContext {
  /** Unique flow execution ID */
  flowId: string;
  /** Input data for the flow */
  input: Record<string, unknown>;
  /** Accumulated output from previous steps */
  output: Record<string, unknown>;
  /** Flow execution metadata */
  metadata: {
    startedAt: string;
    userId?: string;
    [key: string]: unknown;
  };
}

/**
 * Result of a step execution
 */
export interface StepResult {
  /** Step name */
  step: string;
  /** Execution status */
  status: StepStatus;
  /** Step output data */
  data?: unknown;
  /** Error if step failed */
  error?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Definition of a single flow step
 */
export interface FlowStep {
  /** Unique step name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** Condition to determine if step should run */
  condition?: (context: FlowContext) => boolean | Promise<boolean>;
  /** Step execution function */
  execute: (context: FlowContext) => Promise<unknown>;
  /** Error handler for this step */
  onError?: (error: Error, context: FlowContext) => Promise<unknown>;
}

/**
 * Flow definition with ordered steps
 */
export interface FlowDefinition {
  /** Flow name */
  name: string;
  /** Flow description */
  description?: string;
  /** Ordered list of steps */
  steps: FlowStep[];
  /** Global error handler */
  onError?: (error: Error, context: FlowContext) => Promise<void>;
}

/**
 * Flow execution result
 */
export interface FlowResult {
  /** Flow execution ID */
  flowId: string;
  /** Flow name */
  flowName: string;
  /** Overall status */
  status: 'completed' | 'failed' | 'partial';
  /** Results from each step */
  steps: StepResult[];
  /** Final output */
  output: Record<string, unknown>;
  /** Total duration */
  durationMs: number;
  /** Error message if flow failed */
  error?: string;
}

/**
 * Execute a flow with the given definition and input
 * 
 * @param flow - Flow definition with steps
 * @param input - Input data for the flow
 * @param options - Execution options
 * @returns Observable that emits events during flow execution
 * 
 * @example
 * ```typescript
 * const noteFlow: FlowDefinition = {
 *   name: 'noteCreation',
 *   steps: [
 *     { name: 'checkConsent', execute: async (ctx) => {...} },
 *     { name: 'transcribe', execute: async (ctx) => {...} },
 *     { name: 'generate', execute: async (ctx) => {...} }
 *   ]
 * };
 * 
 * startFlow(noteFlow, { sessionId: '123' }).subscribe({
 *   next: (event) => console.log('Flow event:', event),
 *   complete: () => console.log('Flow complete')
 * });
 * ```
 */
export function startFlow(
  flow: FlowDefinition,
  input: Record<string, unknown>,
  options?: {
    userId?: string;
    metadata?: Record<string, unknown>;
  }
): Observable<MScribeEvent | FlowResult> {
  const flowId = `flow-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const startTime = Date.now();

  const context: FlowContext = {
    flowId,
    input,
    output: {},
    metadata: {
      startedAt: new Date().toISOString(),
      userId: options?.userId,
      ...options?.metadata,
    },
  };

  const stepResults: StepResult[] = [];

  // Emit flow started event
  const startEvent = createEvent<MScribeEvent>('run_started' as any, {
    runId: flowId,
    functionName: flow.name,
  } as any);

  // Execute all steps and return final result
  const executeSteps = async (): Promise<FlowResult> => {
    for (const step of flow.steps) {
      const stepStartTime = Date.now();

      try {
        // Check condition
        if (step.condition) {
          const shouldRun = await step.condition(context);
          if (!shouldRun) {
            stepResults.push({
              step: step.name,
              status: 'skipped',
              durationMs: Date.now() - stepStartTime,
            });
            continue;
          }
        }

        // Execute step
        const result = await step.execute(context);
        
        // Update context output
        context.output[step.name] = result;

        stepResults.push({
          step: step.name,
          status: 'completed',
          data: result,
          durationMs: Date.now() - stepStartTime,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Try step-specific error handler
        if (step.onError) {
          try {
            const recoveryResult = await step.onError(error as Error, context);
            context.output[step.name] = recoveryResult;
            stepResults.push({
              step: step.name,
              status: 'completed',
              data: recoveryResult,
              durationMs: Date.now() - stepStartTime,
            });
            continue;
          } catch (recoveryError) {
            // Recovery failed, continue to global handler
          }
        }

        // Record failure
        stepResults.push({
          step: step.name,
          status: 'failed',
          error: errorMessage,
          durationMs: Date.now() - stepStartTime,
        });

        // Try global error handler
        if (flow.onError) {
          await flow.onError(error as Error, context);
        }

        // Return failed result
        return {
          flowId,
          flowName: flow.name,
          status: 'failed',
          steps: stepResults,
          output: context.output,
          durationMs: Date.now() - startTime,
          error: errorMessage,
        };
      }
    }

    // All steps completed
    return {
      flowId,
      flowName: flow.name,
      status: stepResults.some(s => s.status === 'failed') ? 'partial' : 'completed',
      steps: stepResults,
      output: context.output,
      durationMs: Date.now() - startTime,
    };
  };

  // Combine start event with execution result
  return concat(
    of(startEvent),
    from(executeSteps())
  );
}

/**
 * Create a simple step definition
 */
export function createStep(
  name: string,
  execute: (context: FlowContext) => Promise<unknown>,
  options?: {
    description?: string;
    condition?: (context: FlowContext) => boolean | Promise<boolean>;
    onError?: (error: Error, context: FlowContext) => Promise<unknown>;
  }
): FlowStep {
  return {
    name,
    execute,
    ...options,
  };
}
