/**
 * Type definitions for the job scheduler system
 */

export type JobStatus = 'pending' | 'running' | 'success' | 'failed' | 'retrying';

export interface JobConfig {
  /** Unique job identifier */
  id: string;
  
  /** Human-readable job name */
  name: string;
  
  /** Cron expression or interval in milliseconds */
  schedule: string | number;
  
  /** Job handler function */
  handler: JobHandler;
  
  /** Job description */
  description?: string;
  
  /** Maximum execution time in milliseconds */
  timeout?: number;
  
  /** Retry configuration */
  retry?: RetryConfig;
  
  /** Enable/disable the job */
  enabled?: boolean;
  
  /** Job metadata */
  metadata?: Record<string, unknown>;
}

export interface RetryConfig {
  /** Maximum number of retry attempts */
  maxAttempts: number;
  
  /** Delay between retries in milliseconds */
  delayMs: number;
  
  /** Exponential backoff multiplier */
  backoffMultiplier?: number;
  
  /** Maximum delay cap in milliseconds */
  maxDelayMs?: number;
}

export interface ScheduledJob extends JobConfig {
  /** Next scheduled execution time */
  nextRun: Date;
  
  /** Last execution time */
  lastRun?: Date;
  
  /** Current job status */
  status: JobStatus;
  
  /** Number of times executed */
  executionCount: number;
  
  /** Number of consecutive failures */
  failureCount: number;
  
  /** Last error message if failed */
  lastError?: string;
}

export interface JobExecutionContext {
  /** Job ID */
  jobId: string;
  
  /** Execution ID for this run */
  executionId: string;
  
  /** Execution start time */
  startedAt: Date;
  
  /** Attempt number (1 for first attempt, 2+ for retries) */
  attemptNumber: number;
  
  /** Abort signal for cancellation */
  signal: AbortSignal;
  
  /** Logger function */
  log: (message: string, level?: 'info' | 'warn' | 'error') => void;
}

export type JobHandler = (context: JobExecutionContext) => Promise<JobResult>;

export interface JobResult {
  /** Whether the job succeeded */
  success: boolean;
  
  /** Result data */
  data?: unknown;
  
  /** Error message if failed */
  error?: string;
  
  /** Execution duration in milliseconds */
  durationMs: number;
  
  /** Optional metrics */
  metrics?: Record<string, number>;
}

export interface JobExecution {
  /** Execution ID */
  id: string;
  
  /** Job ID */
  jobId: string;
  
  /** Start time */
  startedAt: Date;
  
  /** End time */
  completedAt?: Date;
  
  /** Execution status */
  status: JobStatus;
  
  /** Attempt number */
  attemptNumber: number;
  
  /** Result if completed */
  result?: JobResult;
  
  /** Error if failed */
  error?: string;
}
