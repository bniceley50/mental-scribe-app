import type { LogEvent, LogSink } from '../types';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;

/**
 * Sentry sink for error tracking (optional)
 * Requires manual installation: pnpm add @sentry/react
 * Configure via VITE_SENTRY_DSN env var
 */
export const sentrySink = (): LogSink | null => {
  // Return null if DSN not configured - no Sentry needed
  if (!DSN) return null;
  
  let sentryLoaded = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let Sentry: any = null;

  async function ensureInit() {
    if (sentryLoaded) return;
    try {
      // Only attempt dynamic import at runtime when emit is called
      // This prevents Vite from trying to resolve @sentry/react at build time
      // @ts-expect-error - Optional peer dependency
      Sentry = await import('@sentry/react').then(mod => {
        mod.init({
          dsn: DSN,
          tracesSampleRate: 0.0
        });
        sentryLoaded = true;
        return mod;
      }).catch(() => {
        console.warn('[@logger] Sentry SDK not installed. Run: pnpm add @sentry/react');
        return null;
      });
    } catch {
      // Sentry not available
    }
  }

  return {
    name: 'sentry',
    minLevel: 'error',
    emit: async (e: LogEvent) => {
      await ensureInit();
      if (!Sentry) return;
      Sentry.captureMessage(e.msg, {
        level: 'error',
        extra: { ...e.ctx, sessionId: e.sessionId, route: e.route, ts: e.ts }
      });
    }
  };
};
