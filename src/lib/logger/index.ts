/* eslint-disable no-console */
import { redactCtx } from './redact';
import { consoleSink } from './sinks/console';
import { httpSink } from './sinks/http';
import { sentrySink } from './sinks/sentry';
import { Context, Level, LogEvent, LogSink, levelRank } from './types';

const MODE = import.meta.env.MODE ?? 'development';
const ENV_LEVEL = (import.meta.env.VITE_LOG_LEVEL as Level | undefined) ?? (MODE === 'development' ? 'debug' : 'info');

const sinks: LogSink[] = [];

function registerDefaults() {
  // Always have a console sink; pretty in dev, JSON in prod
  sinks.push(consoleSink(MODE === 'development'));
  const h = httpSink(); if (h) sinks.push(h);
  const s = sentrySink(); if (s) sinks.push(s);
}

registerDefaults();

function emitAll(e: LogEvent) {
  const min = levelRank[ENV_LEVEL];
  if (levelRank[e.level] < min) return;
  for (const s of sinks) {
    if (s.minLevel && levelRank[e.level] < levelRank[s.minLevel]) continue;
    try { void s.emit(e); } catch { /* ignore */ }
  }
}

function makeLogger(baseCtx?: Context, baseMeta?: Pick<LogEvent, 'sessionId' | 'route'>) {
  const log = (level: Level, msg: string, ctx?: Context) => {
    const event: LogEvent = {
      ts: new Date().toISOString(),
      level,
      msg,
      ctx: redactCtx({ ...baseCtx, ...ctx }),
      ...baseMeta
    };
    emitAll(event);
  };
  return {
    debug: (m: string, c?: Context) => log('debug', m, c),
    info:  (m: string, c?: Context) => log('info',  m, c),
    warn:  (m: string, c?: Context) => log('warn',  m, c),
    error: (m: string, error?: Error | unknown, c?: Context) => {
      const errorContext: Context = { ...c };
      if (error instanceof Error) {
        errorContext.error = {
          name: error.name,
          message: error.message,
          stack: error.stack,
        };
      } else if (error) {
        errorContext.error = error;
      }
      log('error', m, errorContext);
    },
    child: (c: Context, meta?: Pick<LogEvent, 'sessionId' | 'route'>) =>
      makeLogger({ ...baseCtx, ...c }, { ...baseMeta, ...meta })
  };
}

export const logger = makeLogger();
