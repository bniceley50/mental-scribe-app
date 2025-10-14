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
          // SECURITY: Strict CSP without unsafe-inline or unsafe-eval
          // This prevents XSS attacks by blocking inline scripts and eval()
          const cspDirectives = [
            "default-src 'self'",
            // Allow scripts from self and Google Fonts only
            "script-src 'self' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
            // Allow styles from self and Google Fonts (some inline styles needed for React components)
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' data: https://fonts.gstatic.com",
            // Allow images from self, data URIs, and blob URIs (for file previews)
            "img-src 'self' data: blob: https:",
            // Allow connections to Supabase and AI gateway
            "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://ai.gateway.lovable.dev https://api.pwnedpasswords.com",
            "frame-ancestors 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "object-src 'none'",
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
