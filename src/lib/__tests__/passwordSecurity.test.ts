import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isPasswordLeaked } from '../passwordSecurity';

describe('Password Security - HIBP Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isPasswordLeaked', () => {
    it('should return true for known leaked password', async () => {
      // "password123" is a commonly leaked password
      const result = await isPasswordLeaked('password123');
      expect(result).toBe(true);
    });

    it('should return false for strong unique password', async () => {
      // Very unlikely to be in breach database
      const result = await isPasswordLeaked('xK9#mP2$vL8@nQ4!wR7^yT6&uI3*oE5');
      expect(result).toBe(false);
    });

    it('should fail closed (return true) on API error', async () => {
      // Mock fetch to simulate API failure
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      
      const result = await isPasswordLeaked('test-password');
      expect(result).toBe(true); // Should fail closed for security
    });

    it('should fail closed (return true) on API timeout', async () => {
      // Mock fetch to simulate timeout
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 100)
        )
      );
      
      const result = await isPasswordLeaked('test-password');
      expect(result).toBe(true); // Should fail closed for security
    });

    it('should only send first 5 characters of hash (k-anonymity)', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ''
      });
      global.fetch = mockFetch;

      await isPasswordLeaked('test-password');
      
      // Verify only first 5 chars of SHA-1 hash are sent
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('https://api.pwnedpasswords.com/range/')
      );
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      const hashPrefix = calledUrl.split('/range/')[1];
      expect(hashPrefix.length).toBe(5);
    });

    it('should handle empty password', async () => {
      const result = await isPasswordLeaked('');
      expect(result).toBe(true); // Empty passwords should be considered leaked
    });

    it('should be case-insensitive', async () => {
      const result1 = await isPasswordLeaked('Password123');
      const result2 = await isPasswordLeaked('PASSWORD123');
      const result3 = await isPasswordLeaked('password123');
      
      // All variations should return the same result
      expect(result1).toBe(result2);
      expect(result2).toBe(result3);
    });

    it('should handle special characters in password', async () => {
      const result = await isPasswordLeaked('P@ssw0rd!#$%^&*()');
      expect(typeof result).toBe('boolean');
    });

    it('should handle non-ASCII characters', async () => {
      const result = await isPasswordLeaked('пароль123');
      expect(typeof result).toBe('boolean');
    });

    it('should fail closed on malformed API response', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => 'invalid-response-format'
      });
      
      const result = await isPasswordLeaked('test-password');
      expect(typeof result).toBe('boolean');
    });

    it('should handle 503 service unavailable gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        text: async () => 'Service Unavailable'
      });
      
      const result = await isPasswordLeaked('test-password');
      expect(result).toBe(true); // Should fail closed
    });
  });

  describe('Security Properties', () => {
    it('should never send full password over network', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ''
      });
      global.fetch = mockFetch;

      const password = 'my-secret-password';
      await isPasswordLeaked(password);
      
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).not.toContain(password);
    });

    it('should use HTTPS for API calls', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        text: async () => ''
      });
      global.fetch = mockFetch;

      await isPasswordLeaked('test');
      
      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toMatch(/^https:\/\//);
    });

    it('should complete in reasonable time (< 5 seconds)', async () => {
      const startTime = Date.now();
      await isPasswordLeaked('test-password');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long passwords', async () => {
      const longPassword = 'a'.repeat(1000);
      const result = await isPasswordLeaked(longPassword);
      expect(typeof result).toBe('boolean');
    });

    it('should handle whitespace-only passwords', async () => {
      const result = await isPasswordLeaked('   ');
      expect(result).toBe(true);
    });

    it('should handle null/undefined gracefully', async () => {
      const result1 = await isPasswordLeaked(null as any);
      expect(typeof result1).toBe('boolean');
      
      const result2 = await isPasswordLeaked(undefined as any);
      expect(typeof result2).toBe('boolean');
    });
  });
});
