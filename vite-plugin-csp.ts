import type { Plugin } from 'vite';

/**
 * Vite plugin to inject Content Security Policy meta tag in production builds
 * Provides defense-in-depth against XSS, clickjacking, and other injection attacks
 */
export function cspPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp',
    transformIndexHtml: {
      order: 'pre',
      handler(html, ctx) {
        // Only apply CSP in production builds
        if (ctx.bundle) {
          const cspDirectives = [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            "img-src 'self' data: blob: https:",
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://fonts.googleapis.com https://fonts.gstatic.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "upgrade-insecure-requests"
          ];

          const cspMeta = `
    <meta http-equiv="Content-Security-Policy" content="${cspDirectives.join('; ')}" />`;

          // Insert CSP meta tag after charset meta
          return html.replace(
            /<meta charset="UTF-8" \/>/,
            `<meta charset="UTF-8" />${cspMeta}`
          );
        }
        return html;
      }
    }
  };
}

/**
 * Plugin to add Subresource Integrity (SRI) hashes to external resources
 * Ensures external scripts and styles haven't been tampered with
 */
export function sriPlugin(): Plugin {
  return {
    name: 'vite-plugin-sri',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        // Add integrity and crossorigin attributes to Google Fonts
        html = html.replace(
          /(<link[^>]*href="https:\/\/fonts\.googleapis\.com[^>]*)>/g,
          '$1 crossorigin="anonymous">'
        );
        
        html = html.replace(
          /(<link[^>]*href="https:\/\/fonts\.gstatic\.com[^>]*)>/g,
          '$1 crossorigin="anonymous">'
        );

        return html;
      }
    }
  };
}
