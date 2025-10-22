/**
 * Job Executor
 * 
 * Handles execution of individual jobs with timeout, cancellation, and logging
 */

import type { JobExecutionContext, JobHandler, JobResult, ScheduledJob } from './types';

export class JobExecutor {
  private runningExecutions: Map<string, AbortController> = new Map();

  /**
   * Execute a job
   */
  async execute(job: ScheduledJob, attemptNumber: number = 1): Promise<JobResult> {
    const executionId = `${job.id}-${Date.now()}-${attemptNumber}`;
    const controller = new AbortController();
    this.runningExecutions.set(executionId, controller);

    const context: JobExecutionContext = {
      jobId: job.id,
      executionId,
      startedAt: new Date(),
      attemptNumber,
      signal: controller.signal,
      log: (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
        this.log(job.id, message, level);
      }
    };

    const startTime = Date.now();

    try {
      // Set timeout if configured
      const timeoutId = job.timeout 
        ? setTimeout(() => controller.abort(), job.timeout)
        : undefined;

      try {
        const result = await job.handler(context);
        
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        return {
          ...result,
          durationMs: Date.now() - startTime
        };
      } catch (error) {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }

        if (controller.signal.aborted) {
          throw new Error(`Job execution timed out after ${job.timeout}ms`);
        }

        throw error;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.log(`Job failed: ${errorMessage}`, 'error');

      return {
        success: false,
        error: errorMessage,
        durationMs: Date.now() - startTime
      };
    } finally {
      this.runningExecutions.delete(executionId);
    }
  }

  /**
   * Cancel a running execution
   */
  cancel(executionId: string): boolean {
    const controller = this.runningExecutions.get(executionId);
    if (controller) {
      controller.abort();
      this.runningExecutions.delete(executionId);
      return true;
    }
    return false;
  }

  /**
   * Cancel all running executions
   */
  cancelAll(): void {
    for (const [executionId, controller] of this.runningExecutions) {
      controller.abort();
    }
    this.runningExecutions.clear();
  }

  /**
   * Get running execution count
   */
  getRunningCount(): number {
    return this.runningExecutions.size;
  }

  /**
   * Log job execution messages
   */
  private log(jobId: string, message: string, level: 'info' | 'warn' | 'error'): void {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Job:${jobId}]`;
    
    switch (level) {
      case 'error':
        console.error(`${prefix} ${message}`);
        break;
      case 'warn':
        console.warn(`${prefix} ${message}`);
        break;
      default:
        console.log(`${prefix} ${message}`);
    }
  }
}
