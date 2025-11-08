import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { logger as rootLogger } from '.';

type LoggerCtx = {
  sessionId: string;
  route?: string;
  logger: typeof rootLogger;
};

const Ctx = createContext<LoggerCtx | null>(null);

export function LoggerProvider({ children }: { children: React.ReactNode }) {
  const sessionId = useMemo(() => crypto.randomUUID(), []);
  const location = useLocation();
  const route = location.pathname;
  
  const scoped = useMemo(
    () => rootLogger.child({}, { sessionId, route }),
    [sessionId, route]
  );
  
  return <Ctx.Provider value={{ sessionId, route, logger: scoped }}>{children}</Ctx.Provider>;
}

export function useLogger() {
  const v = useContext(Ctx);
  return v ?? { sessionId: 'unknown', route: undefined, logger: rootLogger };
}
