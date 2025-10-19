// vite-plugin-csp.ts
import type { Plugin } from 'vite';
import crypto from 'node:crypto';

export function cspPlugin(): Plugin {
  return {
    name: 'vite-plugin-csp-strict',
    apply: 'build',
    transformIndexHtml(html) {
      const nonce = crypto.randomBytes(16).toString('base64');

      const withNonces = html.replace(
        /<script(?![^>]*\bnonce=)([^>]*)>/g,
        (_m, attrs) => `<script nonce="${nonce}"${attrs}>`
      );

      const csp = [
        `default-src 'self'`,
        `base-uri 'self'`,
        `frame-ancestors 'none'`,
        `object-src 'none'`,
        `form-action 'self'`,
        `img-src 'self' data: https:`,
        `font-src 'self' https://fonts.gstatic.com`,
        `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
        `script-src 'nonce-${nonce}' 'strict-dynamic' https:`,
        `connect-src 'self' https://*.supabase.co https://*.supabase.io https://api.openai.com`,
        `upgrade-insecure-requests`,
        `block-all-mixed-content`
      ].join('; ');

      return withNonces.replace(
        /<head>/i,
        `<head><meta http-equiv="Content-Security-Policy" content="${csp}">`
      );
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
