type LogLevel = "debug" | "info" | "warn" | "error";

type LogEntry = {
  timestamp: string;
  level: LogLevel;
  message: string;
  data?: Record<string, unknown>;
};

const LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLevel: LogLevel =
  process.env["LOG_LEVEL"] as LogLevel ?? "info";

function shouldLog(level: LogLevel): boolean {
  return LEVELS[level] >= LEVELS[currentLevel];
}

function writeLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(data !== undefined && { data }),
  };

  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => writeLog("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) => writeLog("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => writeLog("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => writeLog("error", message, data),
};
