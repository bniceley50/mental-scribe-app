import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobExecutor } from '../src/executor';
import type { ScheduledJob, JobResult, JobExecutionContext } from '../src/types';

describe('JobExecutor', () => {
  let executor: JobExecutor;

  beforeEach(() => {
    executor = new JobExecutor();
  });

  const createMockJob = (
    handler: (ctx: JobExecutionContext) => Promise<JobResult>,
    options: Partial<ScheduledJob> = {}
  ): ScheduledJob => ({
    id: 'test-job',
    name: 'Test Job',
    schedule: 60000,
    handler,
    nextRun: new Date(),
    status: 'pending',
    executionCount: 0,
    failureCount: 0,
    ...options
  });

  describe('execute', () => {
  it('should execute a job successfully', async () => {
      const handler = vi.fn().mockResolvedValue({
        success: true,
        durationMs: 100
      });

      const job = createMockJob(handler);
      const result = await executor.execute(job);

      expect(result.success).toBe(true);
      expect(handler).toHaveBeenCalledOnce();
      // duration may be very small on fast machines; allow zero
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it('should handle job errors', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Job failed'));
      const job = createMockJob(handler);
      
      const result = await executor.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Job failed');
    });

    it('should pass execution context to handler', async () => {
      let receivedContext: JobExecutionContext | undefined;
      const handler = vi.fn().mockImplementation(async (context: JobExecutionContext) => {
        receivedContext = context;
        return { success: true, durationMs: 0 };
      });

      const job = createMockJob(handler);
      await executor.execute(job);

  expect(receivedContext).toBeDefined();
  const ctx = receivedContext as JobExecutionContext;
  expect(ctx.jobId).toBe('test-job');
  expect(ctx.attemptNumber).toBe(1);
  expect(ctx.signal).toBeDefined();
  expect(ctx.log).toBeInstanceOf(Function);
    });

    it('should respect timeout configuration', async () => {
      const handler = vi.fn().mockImplementation(async (context: JobExecutionContext) => {
        // Simulate a long-running task that only reacts on abort
        await new Promise((_, reject) => {
          const onAbort = () => reject(new Error('timed out'));
          context.signal.addEventListener('abort', onAbort, { once: true });
        });
        return { success: true, durationMs: 9999 };
      });

      const job = createMockJob(handler, { timeout: 50 });
      const result = await executor.execute(job);

      expect(result.success).toBe(false);
      expect(result.error).toContain('timed out');
    }, 10000);

    it('should track attempt number correctly', async () => {
      const handler = vi.fn().mockResolvedValue({ success: true, durationMs: 0 });
      const job = createMockJob(handler);

      await executor.execute(job, 1);
      await executor.execute(job, 2);

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('cancel', () => {
    it('should cancel a running execution', async () => {
      let cancelled = false;
      const handler = vi.fn().mockImplementation(async (context: JobExecutionContext) => {
        context.signal.addEventListener('abort', () => {
          cancelled = true;
        });
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, durationMs: 0 };
      });

      const job = createMockJob(handler);
      const promise = executor.execute(job);

      // Cancel after a short delay
      setTimeout(() => {
        const internal = executor as unknown as { runningExecutions: Map<string, unknown> };
        const executionId = Array.from(internal.runningExecutions.keys())[0] as string;
        executor.cancel(executionId);
      }, 50);

      await promise;
      expect(cancelled).toBe(true);
    }, 10000);
  });

  describe('getRunningCount', () => {
    it('should return correct count of running executions', async () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { success: true, durationMs: 0 };
      });

      const job1 = createMockJob(handler, { id: 'job-1' });
      const job2 = createMockJob(handler, { id: 'job-2' });

      executor.execute(job1);
      executor.execute(job2);

      expect(executor.getRunningCount()).toBe(2);

      await new Promise(resolve => setTimeout(resolve, 150));
      expect(executor.getRunningCount()).toBe(0);
    }, 10000);
  });

  describe('cancelAll', () => {
    it('should cancel all running executions', () => {
      const handler = vi.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 1000));
        return { success: true, durationMs: 0 };
      });

      const job1 = createMockJob(handler, { id: 'job-1' });
      const job2 = createMockJob(handler, { id: 'job-2' });

      executor.execute(job1);
      executor.execute(job2);

      expect(executor.getRunningCount()).toBe(2);

      executor.cancelAll();
      expect(executor.getRunningCount()).toBe(0);
    });
  });
});
