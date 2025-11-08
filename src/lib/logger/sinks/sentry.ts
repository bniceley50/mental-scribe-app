import type { LogEvent, LogSink } from '../types';

const DSN = (import.meta as any).env?.VITE_SENTRY_DSN as string | undefined;

/**
 * Indirect dynamic import so bundlers can't statically see the specifier.
 * No top-level imports, no type imports from @sentry/react.
 */
const dynImport = (id: string) =>
  (Function('return import(arguments[0])') as any)(id) as Promise<any>;

export const sentrySink = (): LogSink | null => {
  if (!DSN) return null;

  let inited = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let SentryMod: any | null = null;

  async function ensureInit() {
    if (inited) return SentryMod;
    inited = true;

    // Dynamically import via indirection so bundlers cannot resolve at build time.
    try {
      const mod = await dynImport('@sentry/react').catch(() => null);
      if (mod?.init) {
        mod.init({ dsn: DSN, tracesSampleRate: 0.0 });
        SentryMod = mod;
      } else {
        SentryMod = null;
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
