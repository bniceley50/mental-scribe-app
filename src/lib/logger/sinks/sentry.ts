import type { LogEvent, LogSink } from '../types';

const DSN = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;

/**
 * Optional Sentry sink.
 * - No top-level import of @sentry/react
 * - Runtime dynamic import guarded with vite-ignore so Vite doesn't resolve it.
 */
export const sentrySink = (): LogSink | null => {
  if (!DSN) return null;

  let inited = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SentryMod: any | null = null;

  async function ensureInit() {
    if (inited) return SentryMod;
    inited = true;

    // IMPORTANT: do not let Vite/Rollup touch this at build time.
    // If the SDK isn't installed, this resolves to null.
    try {
      // @ts-expect-error - Optional peer dependency
      SentryMod = await import(/* @vite-ignore */ '@sentry/react');
      if (SentryMod?.init) {
        SentryMod.init({ dsn: DSN, tracesSampleRate: 0.0 });
      }
    } catch {
      SentryMod = null;
    }
    return SentryMod;
  }

  return {
    name: 'sentry',
    minLevel: 'error',
    emit: async (e: LogEvent) => {
      const S = await ensureInit();
      if (!S?.captureMessage) return; // no-op if SDK missing
      S.captureMessage(e.msg, {
        level: 'error',
        extra: { ...e.ctx, sessionId: e.sessionId, route: e.route, ts: e.ts }
      });
    }
  };
};
