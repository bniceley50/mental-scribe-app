import { describe, it, expect, beforeEach, vi } from 'vitest';
import { JobRegistry } from '../src/registry';
import type { JobConfig } from '../src/types';

describe('JobRegistry', () => {
  let registry: JobRegistry;
  
  const mockJobConfig: JobConfig = {
    id: 'test-job',
    name: 'Test Job',
    schedule: 60000, // 1 minute interval
    handler: vi.fn()
  };

  beforeEach(() => {
    registry = new JobRegistry();
  });

  describe('register', () => {
    it('should register a new job', () => {
      registry.register(mockJobConfig);
      const job = registry.get('test-job');
      
      expect(job).toBeDefined();
      expect(job?.id).toBe('test-job');
      expect(job?.name).toBe('Test Job');
      expect(job?.status).toBe('pending');
    });

    it('should throw error when registering duplicate job ID', () => {
      registry.register(mockJobConfig);
      
      expect(() => registry.register(mockJobConfig)).toThrow(
        'Job with ID "test-job" is already registered'
      );
    });

    it('should set enabled to true by default', () => {
      registry.register(mockJobConfig);
      const job = registry.get('test-job');
      
      expect(job?.enabled).toBe(true);
    });
  });

  describe('unregister', () => {
    it('should unregister an existing job', () => {
      registry.register(mockJobConfig);
      const result = registry.unregister('test-job');
      
      expect(result).toBe(true);
      expect(registry.get('test-job')).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const result = registry.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('getAll', () => {
    it('should return all registered jobs', () => {
      registry.register(mockJobConfig);
      registry.register({ ...mockJobConfig, id: 'test-job-2' });
      
      const jobs = registry.getAll();
      expect(jobs).toHaveLength(2);
    });

    it('should return empty array when no jobs registered', () => {
      const jobs = registry.getAll();
      expect(jobs).toHaveLength(0);
    });
  });

  describe('getEnabled', () => {
    it('should return only enabled jobs', () => {
      registry.register(mockJobConfig);
      registry.register({ ...mockJobConfig, id: 'test-job-2', enabled: false });
      
      const jobs = registry.getEnabled();
      expect(jobs).toHaveLength(1);
      expect(jobs[0].id).toBe('test-job');
    });
  });

  describe('getDueJobs', () => {
    it('should return jobs that are due for execution', () => {
      registry.register(mockJobConfig);
      
      // Fast-forward time to make job due
      const futureDate = new Date(Date.now() + 120000);
      const dueJobs = registry.getDueJobs(futureDate);
      
      expect(dueJobs).toHaveLength(1);
    });

    it('should not return disabled jobs', () => {
      registry.register({ ...mockJobConfig, enabled: false });
      
      const futureDate = new Date(Date.now() + 120000);
      const dueJobs = registry.getDueJobs(futureDate);
      
      expect(dueJobs).toHaveLength(0);
    });

    it('should not return running jobs', () => {
      registry.register(mockJobConfig);
      registry.updateStatus('test-job', 'running');
      
      const futureDate = new Date(Date.now() + 120000);
      const dueJobs = registry.getDueJobs(futureDate);
      
      expect(dueJobs).toHaveLength(0);
    });
  });

  describe('updateAfterExecution', () => {
    beforeEach(() => {
      registry.register(mockJobConfig);
    });

    it('should update job after successful execution', () => {
      registry.updateAfterExecution('test-job', true);
      const job = registry.get('test-job');
      
      expect(job?.executionCount).toBe(1);
      expect(job?.failureCount).toBe(0);
      expect(job?.status).toBe('pending');
      expect(job?.lastRun).toBeDefined();
    });

    it('should update job after failed execution', () => {
      registry.updateAfterExecution('test-job', false, 'Test error');
      const job = registry.get('test-job');
      
      expect(job?.executionCount).toBe(1);
      expect(job?.failureCount).toBe(1);
      expect(job?.lastError).toBe('Test error');
    });

    it('should set status to retrying when retry is configured', () => {
      registry.register({
        ...mockJobConfig,
        id: 'retry-job',
        retry: { maxAttempts: 3, delayMs: 1000 }
      });
      
      registry.updateAfterExecution('retry-job', false);
      const job = registry.get('retry-job');
      
      expect(job?.status).toBe('retrying');
    });

    it('should set status to failed when max retries exceeded', () => {
      registry.register({
        ...mockJobConfig,
        id: 'retry-job',
        retry: { maxAttempts: 2, delayMs: 1000 }
      });
      
      registry.updateAfterExecution('retry-job', false);
      registry.updateAfterExecution('retry-job', false);
      const job = registry.get('retry-job');
      
      expect(job?.status).toBe('failed');
    });
  });

  describe('setEnabled', () => {
    beforeEach(() => {
      registry.register(mockJobConfig);
    });

    it('should enable a disabled job', () => {
      registry.setEnabled('test-job', false);
      registry.setEnabled('test-job', true);
      const job = registry.get('test-job');
      
      expect(job?.enabled).toBe(true);
    });

    it('should reset failure status when enabling a failed job', () => {
      registry.updateStatus('test-job', 'failed');
      registry.setEnabled('test-job', true);
      const job = registry.get('test-job');
      
      expect(job?.status).toBe('pending');
      expect(job?.failureCount).toBe(0);
    });
  });
});
