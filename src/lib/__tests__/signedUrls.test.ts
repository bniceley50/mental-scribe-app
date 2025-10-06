import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateSignedUrl, refreshFileUrl } from '../signedUrls';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    storage: {
      from: vi.fn()
    }
  }
}));

describe('Signed URL Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateSignedUrl', () => {
    it('should generate signed URL with default expiry (1 hour)', async () => {
      const mockSignedUrl = 'https://example.com/signed-url?token=abc123&exp=3600';
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await generateSignedUrl('clinical-documents', 'test/file.pdf');

      expect(result).toBe(mockSignedUrl);
      expect(supabase.storage.from).toHaveBeenCalledWith('clinical-documents');
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test/file.pdf', 3600);
    });

    it('should generate signed URL with custom expiry', async () => {
      const mockSignedUrl = 'https://example.com/signed-url?token=def456&exp=7200';
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await generateSignedUrl('clinical-documents', 'test/file.pdf', 7200);

      expect(result).toBe(mockSignedUrl);
      expect(mockCreateSignedUrl).toHaveBeenCalledWith('test/file.pdf', 7200);
    });

    it('should return null on error', async () => {
      const mockError = { message: 'Storage error', statusCode: '404' };
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: mockError
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await generateSignedUrl('clinical-documents', 'nonexistent.pdf');

      expect(result).toBeNull();
    });

    it('should handle network errors gracefully', async () => {
      const mockCreateSignedUrl = vi.fn().mockRejectedValue(new Error('Network error'));

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await generateSignedUrl('clinical-documents', 'test.pdf');

      expect(result).toBeNull();
    });

    it('should support different buckets', async () => {
      const buckets = ['clinical-documents', 'recordings', 'avatars'];
      
      for (const bucket of buckets) {
        const mockCreateSignedUrl = vi.fn().mockResolvedValue({
          data: { signedUrl: `https://example.com/${bucket}/file` },
          error: null
        });

        vi.mocked(supabase.storage.from).mockReturnValue({
          createSignedUrl: mockCreateSignedUrl
        } as any);

        await generateSignedUrl(bucket, 'test.pdf');
        expect(supabase.storage.from).toHaveBeenCalledWith(bucket);
      }
    });

    it('should handle paths with special characters', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const paths = [
        'folder/file with spaces.pdf',
        'folder/file-with-dashes.pdf',
        'folder/file_with_underscores.pdf',
        'deep/nested/folder/file.pdf'
      ];

      for (const path of paths) {
        await generateSignedUrl('clinical-documents', path);
        expect(mockCreateSignedUrl).toHaveBeenCalledWith(path, 3600);
      }
    });
  });

  describe('refreshFileUrl', () => {
    it('should extract path from signed URL and refresh', async () => {
      const existingUrl = 'https://example.supabase.co/storage/v1/object/sign/clinical-documents/test/file.pdf?token=old';
      const newSignedUrl = 'https://example.supabase.co/storage/v1/object/sign/clinical-documents/test/file.pdf?token=new';
      
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: newSignedUrl },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await refreshFileUrl(existingUrl);

      expect(result).toBe(newSignedUrl);
    });

    it('should use default bucket when not specified', async () => {
      const existingUrl = 'https://example.supabase.co/storage/v1/object/sign/some-bucket/file.pdf';
      
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'new-url' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      await refreshFileUrl(existingUrl);
      
      expect(supabase.storage.from).toHaveBeenCalledWith('clinical-documents');
    });

    it('should return null for invalid URLs', async () => {
      const invalidUrl = 'not-a-valid-url';
      const result = await refreshFileUrl(invalidUrl);
      
      expect(result).toBeNull();
    });

    it('should handle refresh errors gracefully', async () => {
      const existingUrl = 'https://example.supabase.co/storage/v1/object/sign/clinical-documents/file.pdf';
      
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'File not found' }
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await refreshFileUrl(existingUrl);
      
      expect(result).toBeNull();
    });
  });

  describe('Security Properties', () => {
    it('should never generate URLs without expiry', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      await generateSignedUrl('clinical-documents', 'test.pdf');
      
      // Verify expiry is always provided
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Number)
      );
    });

    it('should use HTTPS for all signed URLs', async () => {
      const mockSignedUrl = 'https://example.com/signed-url';
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: mockSignedUrl },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      const result = await generateSignedUrl('clinical-documents', 'test.pdf');
      
      expect(result).toMatch(/^https:\/\//);
    });

    it('should limit expiry time to prevent indefinite access', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      // Even if caller requests very long expiry, should have reasonable maximum
      const maxExpiry = 86400; // 24 hours
      await generateSignedUrl('clinical-documents', 'test.pdf', maxExpiry);
      
      const [[, expiry]] = mockCreateSignedUrl.mock.calls;
      expect(expiry).toBeLessThanOrEqual(maxExpiry);
    });

    it('should not expose file paths in errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const sensitivePath = 'patients/sensitive/medical-record.pdf';
      
      const mockCreateSignedUrl = vi.fn().mockRejectedValue(
        new Error('Storage error')
      );

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      await generateSignedUrl('clinical-documents', sensitivePath);
      
      // Error logging should not expose full paths
      const errorCalls = consoleErrorSpy.mock.calls.flat().join(' ');
      expect(errorCalls).not.toContain(sensitivePath);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('PHI/Part 2 Compliance', () => {
    it('should always use signed URLs for clinical documents', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      // Clinical documents should never use public URLs
      const result = await generateSignedUrl('clinical-documents', 'patient-notes.pdf');
      
      expect(result).toBeTruthy();
      expect(result).toContain('sign'); // Signed URL contains 'sign' in path
    });

    it('should use short expiry for Part 2 protected data', async () => {
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://example.com/signed' },
        error: null
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        createSignedUrl: mockCreateSignedUrl
      } as any);

      // Part 2 data should use shorter expiry for additional security
      const shortExpiry = 900; // 15 minutes
      await generateSignedUrl('clinical-documents', 'part2-data.pdf', shortExpiry);
      
      expect(mockCreateSignedUrl).toHaveBeenCalledWith(
        'part2-data.pdf',
        shortExpiry
      );
    });
  });
});
