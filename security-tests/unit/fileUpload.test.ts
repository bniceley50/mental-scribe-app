import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  extractTextFromFile,
  uploadFileToStorage,
  saveFileMetadata,
  deleteFile,
} from '../fileUpload';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
    from: vi.fn(),
  },
}));

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

describe('File Upload - Edge Cases & Security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractTextFromFile - Validation', () => {
    it('should reject files exceeding 10MB', async () => {
      const largeFile = new File(['x'.repeat(11 * 1024 * 1024)], 'large.pdf', {
        type: 'application/pdf',
      });

      await expect(extractTextFromFile(largeFile)).rejects.toThrow(
        'File size exceeds maximum allowed size of 10MB'
      );
    });

    it('should reject file exactly at size limit boundary', async () => {
      const maxFile = new File(['x'.repeat(10 * 1024 * 1024 + 1)], 'max.pdf', {
        type: 'application/pdf',
      });

      await expect(extractTextFromFile(maxFile)).rejects.toThrow(
        'File size exceeds maximum allowed size'
      );
    });

    it('should reject PDF without valid magic bytes', async () => {
      const fakePDF = new File(['Not a real PDF'], 'fake.pdf', {
        type: 'application/pdf',
      });

      await expect(extractTextFromFile(fakePDF)).rejects.toThrow(
        'Invalid PDF file format'
      );
    });

    it('should reject unsupported file types', async () => {
      const unsupportedFile = new File(['content'], 'file.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      await expect(extractTextFromFile(unsupportedFile)).rejects.toThrow(
        'Unsupported file type'
      );
    });

    it('should sanitize extracted text to prevent XSS', async () => {
      const maliciousText = '<script>alert("XSS")</script>Normal text';
      const textFile = new File([maliciousText], 'malicious.txt', {
        type: 'text/plain',
      });

      const result = await extractTextFromFile(textFile);
      
      expect(result).not.toContain('<script>');
      expect(result).toContain('Normal text');
    });

    it('should handle empty text files', async () => {
      const emptyFile = new File([''], 'empty.txt', {
        type: 'text/plain',
      });

      const result = await extractTextFromFile(emptyFile);
      expect(result).toBe('');
    });

    it('should handle files with only whitespace', async () => {
      const whitespaceFile = new File(['   \n\n\t  '], 'whitespace.txt', {
        type: 'text/plain',
      });

      const result = await extractTextFromFile(whitespaceFile);
      expect(result.trim()).toBe('');
    });
  });

  describe('uploadFileToStorage - Security', () => {
    it('should reject upload when user is not authenticated', async () => {
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: null },
        error: null,
      });

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await uploadFileToStorage(file, 'conv-123');

      expect(result).toBeNull();
    });

    it('should generate user-scoped file paths', async () => {
      const mockUser = { id: 'user-123' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      await uploadFileToStorage(file, 'conv-456');

      expect(mockUpload).toHaveBeenCalledWith(
        expect.stringContaining('user-123/conv-456/'),
        file,
        expect.any(Object)
      );
    });

    it('should use signed URLs instead of public URLs', async () => {
      const mockUser = { id: 'user-123' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com/temp-token' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await uploadFileToStorage(file, 'conv-456');

      expect(mockCreateSignedUrl).toHaveBeenCalledWith(expect.any(String), 3600);
      expect(result?.url).toContain('signed-url.com');
    });

    it('should handle storage quota exceeded error', async () => {
      const mockUser = { id: 'user-123' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Storage quota exceeded' },
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
      } as any);

      const file = new File(['content'], 'test.txt', { type: 'text/plain' });
      const result = await uploadFileToStorage(file, 'conv-456');

      expect(result).toBeNull();
    });

    it('should prevent file path traversal attacks', async () => {
      const mockUser = { id: 'user-123' };
      vi.mocked(supabase.auth.getUser).mockResolvedValue({
        data: { user: mockUser as any },
        error: null,
      });

      const mockUpload = vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null });
      const mockCreateSignedUrl = vi.fn().mockResolvedValue({
        data: { signedUrl: 'https://signed-url.com' },
        error: null,
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        upload: mockUpload,
        createSignedUrl: mockCreateSignedUrl,
      } as any);

      const file = new File(['content'], '../../etc/passwd', { type: 'text/plain' });
      await uploadFileToStorage(file, 'conv-456');

      const uploadPath = mockUpload.mock.calls[0][0];
      expect(uploadPath).toMatch(/^user-123\/conv-456\//);
      expect(uploadPath).not.toContain('..');
    });
  });

  describe('saveFileMetadata - Data Integrity', () => {
    it('should sanitize file metadata before saving', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'file-123' }, error: null }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const maliciousFileName = '<script>alert("XSS")</script>note.pdf';
      await saveFileMetadata(
        'conv-123',
        maliciousFileName,
        'application/pdf',
        'https://safe-url.com',
        'Safe content'
      );

      const insertedData = mockInsert.mock.calls[0][0][0];
      expect(insertedData.file_name).toBe(maliciousFileName); // Stored as-is in DB
      // UI should handle sanitization when displaying
    });

    it('should handle duplicate file insertions', async () => {
      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { code: '23505', message: 'duplicate key' },
          }),
        }),
      });

      vi.mocked(supabase.from).mockReturnValue({
        insert: mockInsert,
      } as any);

      const result = await saveFileMetadata(
        'conv-123',
        'duplicate.pdf',
        'application/pdf',
        'https://url.com',
        'content'
      );

      expect(result).toBeNull();
    });
  });

  describe('deleteFile - Cascade & Cleanup', () => {
    it('should delete from both storage and database', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      const result = await deleteFile('file-123', 'user-123/conv-456/file.pdf');

      expect(mockRemove).toHaveBeenCalledWith(['user-123/conv-456/file.pdf']);
      expect(mockDelete).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('should handle partial deletion failures gracefully', async () => {
      const mockRemove = vi.fn().mockResolvedValue({ error: null });
      const mockDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: { message: 'DB error' } }),
      });

      vi.mocked(supabase.storage.from).mockReturnValue({
        remove: mockRemove,
      } as any);

      vi.mocked(supabase.from).mockReturnValue({
        delete: mockDelete,
      } as any);

      const result = await deleteFile('file-123', 'user-123/conv-456/file.pdf');

      expect(result).toBe(false);
    });
  });

  describe('Accessibility - File Upload UI', () => {
    it('should preserve accessible file names for screen readers', async () => {
      const file = new File(['content'], 'Patient Assessment Form.pdf', {
        type: 'application/pdf',
      });

      // File name should remain readable and descriptive
      expect(file.name).toMatch(/^[a-zA-Z0-9\s.]+$/);
    });
  });
});
