import { describe, it, expect } from 'vitest';
import {
  isMScribeEvent,
  createEvent,
  RunStartedEvent,
  TextMessageDelta,
  ErrorEvent,
} from '../src/types';

describe('Event Types', () => {
  describe('isMScribeEvent', () => {
    it('should return true for valid events', () => {
      const event = {
        type: 'run_started',
        timestamp: new Date().toISOString(),
        runId: '123',
        functionName: 'test',
      };
      expect(isMScribeEvent(event)).toBe(true);
    });

    it('should return false for invalid events', () => {
      expect(isMScribeEvent(null)).toBe(false);
      expect(isMScribeEvent(undefined)).toBe(false);
      expect(isMScribeEvent({})).toBe(false);
      expect(isMScribeEvent({ type: 'test' })).toBe(false);
      expect(isMScribeEvent({ timestamp: '2025-01-01' })).toBe(false);
    });
  });

  describe('createEvent', () => {
    it('should create RunStartedEvent with timestamp', () => {
      const event = createEvent<RunStartedEvent>('run_started', {
        runId: 'abc123',
        functionName: 'generate-note',
      });

      expect(event.type).toBe('run_started');
      expect(event.runId).toBe('abc123');
      expect(event.functionName).toBe('generate-note');
      expect(new Date(event.timestamp).getTime()).toBeGreaterThan(0);
    });

    it('should create TextMessageDelta with timestamp', () => {
      const event = createEvent<TextMessageDelta>('text_message_delta', {
        delta: 'Hello',
        runId: 'run-456',
      });

      expect(event.type).toBe('text_message_delta');
      expect(event.delta).toBe('Hello');
      expect(event.runId).toBe('run-456');
      expect(event.timestamp).toBeDefined();
    });

    it('should create ErrorEvent with context', () => {
      const event = createEvent<ErrorEvent>('error', {
        error: 'Database connection failed',
        code: 'DB_ERROR',
        context: { query: 'SELECT * FROM users' },
      });

      expect(event.type).toBe('error');
      expect(event.error).toBe('Database connection failed');
      expect(event.code).toBe('DB_ERROR');
      expect(event.context?.query).toBe('SELECT * FROM users');
    });
  });
});
