import { LogEvent, LogSink } from '../types';
import { safeStringify } from '../redact';

export const consoleSink = (pretty = true): LogSink => ({
  name: 'console',
  emit: (e: LogEvent) => {
    if (pretty) {
      const line = `[${e.ts}] ${e.level.toUpperCase()}: ${e.msg}` +
        (e.ctx ? ` ${safeStringify(e.ctx)}` : '') +
        (e.sessionId ? ` sessionId=${e.sessionId}` : '') +
        (e.route ? ` route=${e.route}` : '');
      (e.level === 'error' ? console.error
        : e.level === 'warn' ? console.warn
        : e.level === 'info' ? console.info
        : console.debug)(line);
    } else {
      (e.level === 'error' ? console.error
        : e.level === 'warn' ? console.warn
        : e.level === 'info' ? console.info
        : console.debug)(JSON.stringify(e));
    }
  }
});
