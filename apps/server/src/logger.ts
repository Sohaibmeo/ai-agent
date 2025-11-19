import pino from 'pino';

const level = process.env.LOG_LEVEL ?? 'info';

export const logger = pino({
  level,
  base: { service: 'meal-coach-server' },
  timestamp: pino.stdTimeFunctions.isoTime
});

export type LogContext = Record<string, string | number | boolean | undefined>;

export const withContext = (context: LogContext) => logger.child(context);
