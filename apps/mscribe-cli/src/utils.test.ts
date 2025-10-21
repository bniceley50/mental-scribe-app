import { describe, it, expect, vi, beforeEach } from 'vitest';
import { formatDate, formatDuration } from './utils';

describe('CLI Utils', () => {
  describe('formatDate', () => {
    it('should format date using locale string', () => {
      const date = '2025-10-15T14:30:00Z';
      const result = formatDate(date);
      
      // Just check it's a valid date string (format varies by locale)
      expect(result).toContain('2025');
      expect(result).toContain('10');
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid-date');
      expect(result).toBe('Invalid Date');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(5000)).toBe('5.00s');
    });

    it('should format minutes', () => {
      expect(formatDuration(125000)).toBe('2.08m');
    });

    it('should format long durations', () => {
      expect(formatDuration(7325000)).toBe('122.08m');
    });
  });
});
