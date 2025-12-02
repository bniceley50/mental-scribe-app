import { describe, it, expect } from 'vitest';
import { cspPlugin } from '../vite-plugin-csp';

describe('vite-plugin-csp', () => {
  it('should generate a strict script-src without wildcards', () => {
    const plugin = cspPlugin();
    // @ts-ignore - accessing internal transformIndexHtml for testing
    const transform = plugin.transformIndexHtml as (html: string) => string;
    
    const html = '<head><script>console.log("test")</script></head>';
    const result = transform(html);
    
    // Extract the CSP string
    const match = result.match(/content="([^"]+)"/);
    expect(match).not.toBeNull();
    const csp = match![1];
    
    // Parse directives
    const directives = csp.split(';').reduce((acc, curr) => {
      const [key, ...values] = curr.trim().split(' ');
      acc[key] = values.join(' ');
      return acc;
    }, {} as Record<string, string>);
    
    const scriptSrc = directives['script-src'];
    
    // Assertions for VULN-002 remediation
    expect(scriptSrc).toContain("'strict-dynamic'");
    expect(scriptSrc).toContain("'nonce-");
    expect(scriptSrc).not.toContain('https:');
    expect(scriptSrc).not.toContain('*');
  });
});
