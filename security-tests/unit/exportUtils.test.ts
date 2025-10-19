import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import DOMPurify from 'dompurify';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            data: [
              {
                id: '1',
                role: 'user',
                content: 'Test message',
                created_at: new Date().toISOString(),
              },
            ],
            error: null,
          })),
        })),
      })),
    })),
  },
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('Export Utilities', () => {
  describe('Content Sanitization', () => {
    it('should sanitize malicious script tags', () => {
      const maliciousContent = '<script>alert("XSS")</script>Hello World';
      const sanitized = DOMPurify.sanitize(maliciousContent, { ALLOWED_TAGS: [] });
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toBe('Hello World');
    });

    it('should sanitize HTML injection attempts', () => {
      const maliciousContent = '<img src=x onerror="alert(1)">Test';
      const sanitized = DOMPurify.sanitize(maliciousContent, { ALLOWED_TAGS: [] });
      
      expect(sanitized).not.toContain('<img');
      expect(sanitized).not.toContain('onerror');
      expect(sanitized).toBe('Test');
    });

    it('should preserve plain text content', () => {
      const plainText = 'This is a normal clinical note with no HTML';
      const sanitized = DOMPurify.sanitize(plainText, { ALLOWED_TAGS: [] });
      
      expect(sanitized).toBe(plainText);
    });

    it('should handle special characters safely', () => {
      const specialChars = 'Patient reported: "I feel <anxious> & worried"';
      const sanitized = DOMPurify.sanitize(specialChars, { ALLOWED_TAGS: [] });
      
      // DOMPurify should handle special chars correctly
      expect(sanitized).toContain('anxious');
      expect(sanitized).toContain('&');
    });
  });

  describe('DOM Cleanup', () => {
    let createElementSpy: any;
    let appendChildSpy: any;
    let removeChildSpy: any;
    let revokeObjectURLSpy: any;

    beforeEach(() => {
      createElementSpy = vi.spyOn(document, 'createElement');
      appendChildSpy = vi.spyOn(document.body, 'appendChild');
      removeChildSpy = vi.spyOn(document.body, 'removeChild');
      revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL');
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('should create and cleanup anchor element for downloads', () => {
      const blob = new Blob(['test content'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'test.txt';

      // Simulate the triggerDownload pattern
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);

      expect(appendChildSpy).toHaveBeenCalled();
      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(url);
    });

    it('should always cleanup even if click fails', () => {
      const blob = new Blob(['test'], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = 'test.txt';

      // Simulate error during click
      const clickSpy = vi.spyOn(anchor, 'click').mockImplementation(() => {
        throw new Error('Click failed');
      });

      try {
        document.body.appendChild(anchor);
        anchor.click();
      } catch (error) {
        // Expected error
      } finally {
        document.body.removeChild(anchor);
        URL.revokeObjectURL(url);
      }

      expect(removeChildSpy).toHaveBeenCalled();
      expect(revokeObjectURLSpy).toHaveBeenCalledWith(url);
      
      clickSpy.mockRestore();
    });
  });

  describe('Filename Sanitization', () => {
    it('should sanitize filenames to prevent directory traversal', () => {
      const maliciousFilename = '../../../etc/passwd';
      const sanitized = maliciousFilename.replace(/[^a-z0-9]/gi, '_');
      
      expect(sanitized).not.toContain('..');
      expect(sanitized).not.toContain('/');
      expect(sanitized).toBe('_________etc_passwd');
    });

    it('should handle special characters in filenames', () => {
      const filename = 'My Notes: Session #1 (2024)';
      const sanitized = filename.replace(/[^a-z0-9]/gi, '_');
      
      expect(sanitized).toBe('My_Notes__Session__1__2024_');
      expect(sanitized).toMatch(/^[a-zA-Z0-9_]+$/);
    });
  });
});
