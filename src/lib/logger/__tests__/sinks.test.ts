import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

describe('logger sinks', () => {
  const originalEnv = import.meta.env;
  
  beforeEach(() => {
    vi.resetModules();
    (global as any).fetch = vi.fn(() => Promise.resolve({ ok: true })) as any;
  });
  
  afterAll(() => {
    (import.meta as any).env = originalEnv;
  });

  it('http sink posts events when configured', async () => {
    (import.meta as any).env = { 
      VITE_LOG_POST_URL: 'https://example.local/log', 
      MODE: 'test', 
      VITE_LOG_LEVEL: 'debug' 
    };
    
    const { logger } = await import('..');
    logger.info('hello', { email: 'a@b.com' });
    
    // allow microtask
    await new Promise(r => setTimeout(r, 10));
    
    expect(global.fetch).toHaveBeenCalled();
    const fetchMock = global.fetch as ReturnType<typeof vi.fn>;
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.msg).toBe('hello');
    expect(JSON.stringify(body)).not.toContain('a@b.com'); // redacted
  });

  it('redacts PII patterns in context', async () => {
    const { logger } = await import('..');
    
    // Mock console to capture output
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('test message', { 
      ssn: '123-45-6789',
      phone: '(555) 123-4567',
      email: 'user@example.com'
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('[REDACTED]');
    expect(logOutput).not.toContain('123-45-6789');
    expect(logOutput).not.toContain('user@example.com');
    
    consoleSpy.mockRestore();
  });

  it('preserves whitelisted keys', async () => {
    const { logger } = await import('..');
    
    const consoleSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    
    logger.info('test', { 
      sessionId: 'session-123',
      route: '/dashboard',
      feature: 'export'
    });
    
    expect(consoleSpy).toHaveBeenCalled();
    const logOutput = consoleSpy.mock.calls[0][0];
    expect(logOutput).toContain('session-123');
    expect(logOutput).toContain('/dashboard');
    expect(logOutput).toContain('export');
    
    consoleSpy.mockRestore();
  });
});
