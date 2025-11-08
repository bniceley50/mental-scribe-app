export type Level = 'debug' | 'info' | 'warn' | 'error';
export type Context = Record<string, unknown>;

export type LogEvent = {
  ts: string;
  level: Level;
  msg: string;
  ctx?: Context;
  sessionId?: string;
  route?: string;
};

export interface LogSink {
  name: string;
  minLevel?: Level;
  emit: (e: LogEvent) => void | Promise<void>;
}

export const levelRank: Record<Level, number> = {
  debug: 10, info: 20, warn: 30, error: 40
};
