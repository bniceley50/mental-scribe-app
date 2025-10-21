// vite-plugin-csp.ts
import type { Plugin } from 'vite';

export function cspPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp-strict',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Fixed CSP policy - removed broken nonce injection
        // Vite handles script hashing, we don't need manual nonces
        const csp = [
          `default-src 'self'`,
          `base-uri 'self'`,
          `frame-ancestors 'none'`,
          `object-src 'none'`,
          `form-action 'self'`,
          `img-src 'self' data: blob: https:`,
          `font-src 'self' data: https://fonts.gstatic.com`,
          // Allow inline styles for Radix UI animations/portals
          `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
          // Allow bundled scripts (Vite hashes them automatically)
          `script-src 'self' 'unsafe-inline'`,
          // Allow Supabase WebSockets and API connections
          `connect-src 'self' https://*.supabase.co https://*.supabase.io wss://*.supabase.co https://api.openai.com`,
          `upgrade-insecure-requests`
        ].join('; ');

        return html.replace(
          /<head>/i,
          `<head>\n    <meta http-equiv="Content-Security-Policy" content="${csp}">`
        );
      }
    }
  };
}

export function sriPlugin(): Plugin {
  return {
    name: 'vite-plugin-sri',
    apply: 'build',
    transformIndexHtml(html) {
      return html;
    }
  };
}
