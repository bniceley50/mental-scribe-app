import type { LogEvent, LogSink } from '../types';

const DSN = import.meta.env.VITE_SENTRY_DSN as string | undefined;
let sentryLoaded = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let Sentry: any = null;

async function ensureInit() {
  if (sentryLoaded || !DSN) return;
  try {
    // Lazy import - will gracefully fail if @sentry/react not installed
    // @ts-expect-error - Optional dependency, may not be installed
    const mod = await import('@sentry/react').catch(() => null);
    if (!mod) return;
    Sentry = mod;
    Sentry.init({
      dsn: DSN,
      tracesSampleRate: 0.0
    });
    sentryLoaded = true;
  } catch {
    // Sentry not available, skip initialization
  }
}

export const sentrySink = (): LogSink | null => {
  if (!DSN) return null;
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
