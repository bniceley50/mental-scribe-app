import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { JobScheduler } from '../src/scheduler';

describe('JobScheduler', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should start, execute due jobs, and stop', async () => {
    const scheduler = new JobScheduler({ checkIntervalMs: 10, maxConcurrentJobs: 2, verbose: false });

    const handler = vi.fn().mockResolvedValue({ success: true, durationMs: 1 });

    scheduler.register({
      id: 'tick-job',
      name: 'Tick Job',
      schedule: 20, // every 20ms
      handler,
    });

    await scheduler.start();

    // Advance timers to trigger a few ticks
    vi.advanceTimersByTime(100);
    // Allow any pending promises to resolve
    await Promise.resolve();

    await scheduler.stop();

    expect(handler).toHaveBeenCalled();
  });

  it('should respect maxConcurrentJobs', async () => {
    const scheduler = new JobScheduler({ checkIntervalMs: 5, maxConcurrentJobs: 1, verbose: false });

    const longHandler = vi.fn().mockImplementation(async () => {
      await new Promise(resolve => setTimeout(resolve, 100));
      return { success: true, durationMs: 100 };
    });

    scheduler.register({ id: 'job-1', name: 'Job 1', schedule: 5, handler: longHandler });
    scheduler.register({ id: 'job-2', name: 'Job 2', schedule: 5, handler: longHandler });

    await scheduler.start();

    // Trigger a few scheduler ticks
    vi.advanceTimersByTime(20);
    await Promise.resolve();

    // Only one job should be running due to concurrency limit
  const stats = scheduler.getStats();
  expect(stats.runningJobs).toBeLessThanOrEqual(1);

    await scheduler.stop();
  });
});
