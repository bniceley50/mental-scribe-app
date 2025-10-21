import { describe, it, expect, vi } from 'vitest';
import { startFlow, createStep, FlowDefinition, FlowContext } from '../src/engine';
import { firstValueFrom, lastValueFrom, toArray } from 'rxjs';

describe('Flow Engine', () => {
  describe('createStep', () => {
    it('should create a step with required fields', () => {
      const step = createStep('test', async () => ({ result: 'ok' }));
      
      expect(step.name).toBe('test');
      expect(step.execute).toBeInstanceOf(Function);
    });

    it('should create a step with optional fields', () => {
      const condition = async () => true;
      const onError = async () => ({ recovered: true });
      
      const step = createStep(
        'test',
        async () => ({ result: 'ok' }),
        {
          description: 'Test step',
          condition,
          onError,
        }
      );
      
      expect(step.description).toBe('Test step');
      expect(step.condition).toBe(condition);
      expect(step.onError).toBe(onError);
    });
  });

  describe('startFlow', () => {
    it('should execute a simple flow with one step', async () => {
      const flow: FlowDefinition = {
        name: 'simpleFlow',
        steps: [
          createStep('step1', async (context: FlowContext) => {
            return { result: 'success', input: context.input.value };
          }),
        ],
      };

      const events$ = startFlow(flow, { value: 42 });
      const events = await firstValueFrom(events$.pipe(toArray()));

      // Should emit: run_started event, flow result
      expect(events.length).toBeGreaterThan(0);
      
      const result: any = events[events.length - 1];
      expect(result.flowName).toBe('simpleFlow');
      expect(result.status).toBe('completed');
      expect(result.steps).toHaveLength(1);
      expect(result.steps[0].step).toBe('step1');
      expect(result.steps[0].status).toBe('completed');
      expect(result.output.step1).toEqual({ result: 'success', input: 42 });
    });

    it('should execute multiple steps sequentially', async () => {
      const executionOrder: string[] = [];

      const flow: FlowDefinition = {
        name: 'multiStepFlow',
        steps: [
          createStep('step1', async () => {
            executionOrder.push('step1');
            return { value: 1 };
          }),
          createStep('step2', async (context: FlowContext) => {
            executionOrder.push('step2');
            const step1Output: any = context.output.step1;
            return { value: step1Output.value + 1 };
          }),
          createStep('step3', async (context: FlowContext) => {
            executionOrder.push('step3');
            const step2Output: any = context.output.step2;
            return { value: step2Output.value + 1 };
          }),
        ],
      };

      const events$ = startFlow(flow, {});
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(executionOrder).toEqual(['step1', 'step2', 'step3']);
      expect(result.steps).toHaveLength(3);
      expect(result.output.step3).toEqual({ value: 3 });
    });

    it('should skip steps when condition returns false', async () => {
      const flow: FlowDefinition = {
        name: 'conditionalFlow',
        steps: [
          createStep(
            'step1',
            async () => ({ executed: true }),
            { condition: async () => true }
          ),
          createStep(
            'step2',
            async () => ({ executed: true }),
            { condition: async () => false }
          ),
          createStep(
            'step3',
            async () => ({ executed: true }),
            { condition: async () => true }
          ),
        ],
      };

      const events$ = startFlow(flow, {});
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(result.steps[0].status).toBe('completed');
      expect(result.steps[1].status).toBe('skipped');
      expect(result.steps[2].status).toBe('completed');
    });

    it('should handle step errors with step-level error handler', async () => {
      const flow: FlowDefinition = {
        name: 'errorRecoveryFlow',
        steps: [
          createStep(
            'failingStep',
            async () => {
              throw new Error('Step failed');
            },
            {
              onError: async () => {
                return { recovered: true };
              },
            }
          ),
          createStep('nextStep', async () => ({ executed: true })),
        ],
      };

      const events$ = startFlow(flow, {});
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(result.steps[0].status).toBe('completed');
      expect(result.steps[0].data).toEqual({ recovered: true });
      expect(result.steps[1].status).toBe('completed');
    });

    it('should handle flow-level errors', async () => {
      const onErrorMock = vi.fn();

      const flow: FlowDefinition = {
        name: 'failingFlow',
        steps: [
          createStep('failingStep', async () => {
            throw new Error('Unrecoverable error');
          }),
        ],
        onError: onErrorMock,
      };

      const events$ = startFlow(flow, {});
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(result.status).toBe('failed');
      expect(result.error).toContain('Unrecoverable error');
      expect(onErrorMock).toHaveBeenCalled();
    });

    it('should pass context between steps', async () => {
      const flow: FlowDefinition = {
        name: 'contextFlow',
        steps: [
          createStep('step1', async (context: FlowContext) => {
            expect(context.input.userId).toBe('user-123');
            return { step1Data: 'value1' };
          }),
          createStep('step2', async (context: FlowContext) => {
            expect(context.output.step1).toEqual({ step1Data: 'value1' });
            return { step2Data: 'value2' };
          }),
        ],
      };

      const events$ = startFlow(flow, { userId: 'user-123' }, { userId: 'user-123' });
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(result.output.step1).toEqual({ step1Data: 'value1' });
      expect(result.output.step2).toEqual({ step2Data: 'value2' });
    });

    it('should include execution metadata', async () => {
      const flow: FlowDefinition = {
        name: 'metadataFlow',
        steps: [
          createStep('step1', async (context: FlowContext) => {
            expect(context.flowId).toBeDefined();
            expect(context.metadata.startedAt).toBeDefined();
            expect(context.metadata.userId).toBe('user-456');
            return { done: true };
          }),
        ],
      };

      const events$ = startFlow(
        flow,
        {},
        { userId: 'user-456', metadata: { customField: 'value' } }
      );
      const events = await firstValueFrom(events$.pipe(toArray()));
      const result: any = events[events.length - 1];

      expect(result.flowId).toBeDefined();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });
  });
});
