/**
 * Job Scheduler
 * 
 * Main orchestrator for scheduled job execution
 */

import { JobRegistry } from './registry';
import { JobExecutor } from './executor';
import type { JobConfig, ScheduledJob } from './types';

export interface SchedulerConfig {
  /** Check interval in milliseconds */
  checkIntervalMs?: number;
  
  /** Maximum concurrent jobs */
  maxConcurrentJobs?: number;
  
  /** Enable detailed logging */
  verbose?: boolean;
}

export class JobScheduler {
  private registry: JobRegistry;
  private executor: JobExecutor;
  private config: Required<SchedulerConfig>;
  private intervalId?: NodeJS.Timeout;
  private isRunning: boolean = false;

  constructor(config: SchedulerConfig = {}) {
    this.registry = new JobRegistry();
    this.executor = new JobExecutor();
    this.config = {
      checkIntervalMs: config.checkIntervalMs || 60000, // 1 minute
      maxConcurrentJobs: config.maxConcurrentJobs || 5,
      verbose: config.verbose || false
    };
  }

  /**
   * Register a new job
   */
  register(config: JobConfig): void {
    this.registry.register(config);
    this.log(`Registered job: ${config.id} (${config.name})`);
  }

  /**
   * Unregister a job
   */
  unregister(jobId: string): boolean {
    const result = this.registry.unregister(jobId);
    if (result) {
      this.log(`Unregistered job: ${jobId}`);
    }
    return result;
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      this.log('Scheduler is already running', 'warn');
      return;
    }

    this.isRunning = true;
    this.log('Starting scheduler...');

    // Run immediately on start
    this.tick();

    // Then run on interval
    this.intervalId = setInterval(() => {
      this.tick();
    }, this.config.checkIntervalMs);

    this.log(`Scheduler started (check interval: ${this.config.checkIntervalMs}ms)`);
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Cancel all running jobs
    this.executor.cancelAll();

    this.log('Scheduler stopped');
  }

  /**
   * Get all jobs
   */
  getJobs(): ScheduledJob[] {
    return this.registry.getAll();
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): ScheduledJob | undefined {
    return this.registry.get(jobId);
  }

  /**
   * Enable/disable a job
   */
  setJobEnabled(jobId: string, enabled: boolean): void {
    this.registry.setEnabled(jobId, enabled);
    this.log(`Job ${jobId} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Trigger a job immediately (ignoring schedule)
   */
  async triggerJob(jobId: string): Promise<void> {
    const job = this.registry.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }

    this.log(`Manually triggering job: ${job.id}`);
    await this.executeJob(job);
  }

  /**
   * Scheduler tick - check for due jobs and execute them
   */
  private async tick(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    const dueJobs = this.registry.getDueJobs();
    
    if (dueJobs.length === 0) {
      return;
    }

    this.log(`Found ${dueJobs.length} due job(s)`);

    // Respect max concurrent jobs limit
    const runningCount = this.executor.getRunningCount();
    const availableSlots = this.config.maxConcurrentJobs - runningCount;
    
    if (availableSlots <= 0) {
      this.log(`Max concurrent jobs (${this.config.maxConcurrentJobs}) reached, skipping execution`, 'warn');
      return;
    }

    const jobsToExecute = dueJobs.slice(0, availableSlots);

    // Execute jobs in parallel
    await Promise.allSettled(
      jobsToExecute.map(job => this.executeJob(job))
    );
  }

  /**
   * Execute a single job
   */
  private async executeJob(job: ScheduledJob): Promise<void> {
    this.log(`Executing job: ${job.id} (${job.name})`);
    
    // Update status to running
    this.registry.updateStatus(job.id, 'running');

    const attemptNumber = job.status === 'retrying' ? job.failureCount + 1 : 1;

    try {
      // Execute the job
      const result = await this.executor.execute(job, attemptNumber);

      // Update registry with result
      this.registry.updateAfterExecution(job.id, result.success, result.error);

      if (result.success) {
        this.log(`Job completed successfully: ${job.id} (${result.durationMs}ms)`);
      } else {
        this.log(`Job failed: ${job.id} - ${result.error}`, 'error');
        
        // Log retry info
        if (job.retry && job.failureCount < job.retry.maxAttempts) {
          this.log(`Job will retry (attempt ${job.failureCount + 1}/${job.retry.maxAttempts})`, 'warn');
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.log(`Job execution error: ${job.id} - ${errorMessage}`, 'error');
      this.registry.updateAfterExecution(job.id, false, errorMessage);
    }
  }

  /**
   * Get scheduler statistics
   */
  getStats() {
    const jobs = this.registry.getAll();
    
    return {
      totalJobs: jobs.length,
      enabledJobs: jobs.filter(j => j.enabled).length,
      runningJobs: jobs.filter(j => j.status === 'running').length,
      failedJobs: jobs.filter(j => j.status === 'failed').length,
      retryingJobs: jobs.filter(j => j.status === 'retrying').length,
      totalExecutions: jobs.reduce((sum, j) => sum + j.executionCount, 0),
      isRunning: this.isRunning
    };
  }

  /**
   * Log message
   */
  private log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    if (!this.config.verbose && level === 'info') {
      return;
    }

    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [Scheduler]`;
    
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
