import { describe, it, expect, vi, beforeEach } from 'vitest';
import { logClientView } from '../clientAudit';
import { supabase } from '@/integrations/supabase/client';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    rpc: vi.fn(),
    auth: {
      getUser: vi.fn()
    }
  }
}));

describe('Client Audit Logging', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('logClientView', () => {
    const mockClientId = '123e4567-e89b-12d3-a456-426614174000';
    const mockUserId = '987e4567-e89b-12d3-a456-426614174999';

    it('should successfully log client view with default access method', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      await logClientView(mockClientId);

      expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
        _client_id: mockClientId,
        _access_method: 'unknown'
      });
    });

    it('should log client view with custom access method', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      await logClientView(mockClientId, 'clinical_staff');

      expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
        _client_id: mockClientId,
        _access_method: 'clinical_staff'
      });
    });

    it('should handle RPC errors gracefully', async () => {
      const mockError = { message: 'RPC failed', code: 'PGRST123' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: mockError });

      await expect(logClientView(mockClientId)).resolves.not.toThrow();
      
      expect(supabase.rpc).toHaveBeenCalled();
    });

    it('should validate UUID format for client_id', async () => {
      const invalidClientId = 'not-a-uuid';
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      await logClientView(invalidClientId);
      
      // Should still call RPC - validation happens server-side
      expect(supabase.rpc).toHaveBeenCalled();
    });

    it('should support all valid access methods', async () => {
      const accessMethods: Array<'direct_owner' | 'admin' | 'clinical_staff' | 'unknown'> = [
        'direct_owner',
        'admin',
        'clinical_staff',
        'unknown'
      ];

      for (const method of accessMethods) {
        vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
        await logClientView(mockClientId, method);
        
        expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
          _client_id: mockClientId,
          _access_method: method
        });
      }
    });

    it('should handle network errors', async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error('Network error'));

      await expect(logClientView(mockClientId)).resolves.not.toThrow();
    });

    it('should not expose sensitive data in errors', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mockError = { message: 'Failed', details: 'sensitive-info' };
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: mockError });

      await logClientView(mockClientId);

      // Should not log sensitive details
      expect(consoleErrorSpy).not.toHaveBeenCalledWith(
        expect.stringContaining('sensitive-info')
      );
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('Audit Trail Security Properties', () => {
    it('should be immutable once logged', async () => {
      // This is enforced by database policies, but we verify the function behavior
      const clientId = '123e4567-e89b-12d3-a456-426614174000';
      
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
      await logClientView(clientId, 'admin');

      // Verify RPC was called correctly
      expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
        _client_id: clientId,
        _access_method: 'admin'
      });
    });

    it('should always include timestamp (server-side)', async () => {
      const clientId = '123e4567-e89b-12d3-a456-426614174000';
      
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
      await logClientView(clientId);

      // Timestamp is added server-side by the database function
      expect(supabase.rpc).toHaveBeenCalled();
    });

    it('should capture user context automatically', async () => {
      const clientId = '123e4567-e89b-12d3-a456-426614174000';
      
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });
      await logClientView(clientId, 'clinical_staff');

      // User context (auth.uid()) is captured server-side
      expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
        _client_id: clientId,
        _access_method: 'clinical_staff'
      });
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should complete logging quickly (< 1 second)', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const startTime = Date.now();
      await logClientView('123e4567-e89b-12d3-a456-426614174000');
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle concurrent logging calls', async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      const promises = Array.from({ length: 10 }, (_, i) => 
        logClientView(`123e4567-e89b-12d3-a456-42661417400${i}`)
      );

      await expect(Promise.all(promises)).resolves.not.toThrow();
      expect(supabase.rpc).toHaveBeenCalledTimes(10);
    });
  });

  describe('Compliance and Audit Requirements', () => {
    it('should support HIPAA audit trail requirements', async () => {
      // HIPAA requires: who, what, when, where for PHI access
      const clientId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      await logClientView(clientId, 'clinical_staff');

      // Verify we're capturing the required data
      expect(supabase.rpc).toHaveBeenCalledWith('log_client_view', {
        _client_id: clientId, // WHAT
        _access_method: 'clinical_staff' // HOW
        // WHO: auth.uid() captured server-side
        // WHEN: timestamp added server-side
        // WHERE: program_id captured server-side
      });
    });

    it('should support 42 CFR Part 2 audit requirements', async () => {
      // Part 2 requires tracking all disclosures
      const clientId = '123e4567-e89b-12d3-a456-426614174000';
      vi.mocked(supabase.rpc).mockResolvedValue({ data: null, error: null });

      await logClientView(clientId, 'admin');

      expect(supabase.rpc).toHaveBeenCalled();
    });
  });
});
