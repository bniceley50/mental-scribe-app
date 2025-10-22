/**
 * Job Registry
 * 
 * Manages registration and retrieval of scheduled jobs
 */

import type { JobConfig, ScheduledJob } from './types';

export class JobRegistry {
  private jobs: Map<string, ScheduledJob> = new Map();

  /**
   * Register a new job
   */
  register(config: JobConfig): void {
    if (this.jobs.has(config.id)) {
      throw new Error(`Job with ID "${config.id}" is already registered`);
    }

    const job: ScheduledJob = {
      ...config,
      nextRun: this.calculateNextRun(config.schedule),
      status: 'pending',
      executionCount: 0,
      failureCount: 0,
      enabled: config.enabled !== false
    };

    this.jobs.set(config.id, job);
  }

  /**
   * Unregister a job
   */
  unregister(jobId: string): boolean {
    return this.jobs.delete(jobId);
  }

  /**
   * Get a job by ID
   */
  get(jobId: string): ScheduledJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs
   */
  getAll(): ScheduledJob[] {
    return Array.from(this.jobs.values());
  }

  /**
   * Get enabled jobs
   */
  getEnabled(): ScheduledJob[] {
    return this.getAll().filter(job => job.enabled);
  }

  /**
   * Get jobs due for execution
   */
  getDueJobs(now: Date = new Date()): ScheduledJob[] {
    return this.getEnabled().filter(
      job => job.status === 'pending' && job.nextRun <= now
    );
  }

  /**
   * Update job status
   */
  updateStatus(jobId: string, status: ScheduledJob['status']): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.status = status;
    }
  }

  /**
   * Update job after execution
   */
  updateAfterExecution(jobId: string, success: boolean, error?: string): void {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.lastRun = new Date();
    job.executionCount++;
    
    if (success) {
      job.failureCount = 0;
      job.lastError = undefined;
      job.status = 'pending';
      job.nextRun = this.calculateNextRun(job.schedule, job.lastRun);
    } else {
      job.failureCount++;
      job.lastError = error;
      
      // Check if we should retry
      if (job.retry && job.failureCount < job.retry.maxAttempts) {
        job.status = 'retrying';
        job.nextRun = this.calculateRetryTime(job);
      } else {
        job.status = 'failed';
        // Schedule next attempt anyway (will retry from scratch)
        job.nextRun = this.calculateNextRun(job.schedule, job.lastRun);
      }
    }
  }

  /**
   * Enable/disable a job
   */
  setEnabled(jobId: string, enabled: boolean): void {
    const job = this.jobs.get(jobId);
    if (job) {
      job.enabled = enabled;
      if (enabled && job.status === 'failed') {
        job.status = 'pending';
        job.failureCount = 0;
      }
    }
  }

  /**
   * Calculate next run time based on schedule
   */
  private calculateNextRun(schedule: string | number, from: Date = new Date()): Date {
    if (typeof schedule === 'number') {
      // Interval in milliseconds
      return new Date(from.getTime() + schedule);
    }

    // Cron expression (simplified - for production use cron-parser library)
    // This is a basic implementation
    return this.parseCronExpression(schedule, from);
  }

  /**
   * Simple cron parser (for demo - use cron-parser in production)
   */
  private parseCronExpression(cron: string, from: Date): Date {
    // Format: "minute hour day month dayOfWeek"
    // Example: "0 2 * * 0" = Every Sunday at 2:00 AM
    const parts = cron.split(' ');
    
    if (parts.length !== 5) {
      throw new Error('Invalid cron expression');
    }

    const [minute, hour, day, month, dayOfWeek] = parts;
    const next = new Date(from);

    // Simple increment by 1 hour for demo
    // In production, use cron-parser library for accurate scheduling
    next.setHours(next.getHours() + 1);
    
    return next;
  }

  /**
   * Calculate retry time with exponential backoff
   */
  private calculateRetryTime(job: ScheduledJob): Date {
    if (!job.retry) {
      return new Date();
    }

    const baseDelay = job.retry.delayMs;
    const multiplier = job.retry.backoffMultiplier || 1;
    const maxDelay = job.retry.maxDelayMs || Infinity;
    
    // Calculate delay with exponential backoff
    const attempt = job.failureCount;
    const delay = Math.min(
      baseDelay * Math.pow(multiplier, attempt - 1),
      maxDelay
    );

    return new Date(Date.now() + delay);
  }
}
