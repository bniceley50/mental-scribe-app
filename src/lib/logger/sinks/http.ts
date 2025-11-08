import { LogEvent, LogSink } from '../types';

const POST_URL = import.meta.env.VITE_LOG_POST_URL as string | undefined;
const AUTH = import.meta.env.VITE_LOG_POST_AUTH as string | undefined;

export const httpSink = (): LogSink | null => {
  if (!POST_URL) return null;
  return {
    name: 'http',
    minLevel: 'info',
    emit: async (e: LogEvent) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      try {
        await fetch(POST_URL, {
          method: 'POST',
          keepalive: true,
          headers: {
            'content-type': 'application/json',
            ...(AUTH ? { authorization: AUTH } : {})
          },
          body: JSON.stringify(e),
          signal: ctrl.signal
        });
      } catch {
        // swallow
      } finally {
        clearTimeout(t);
      }
    }
  };
};
