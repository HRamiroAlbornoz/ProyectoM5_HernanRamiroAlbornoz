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

const LOG_LEVELS: ReadonlyArray<LogLevel> = ["debug", "info", "warn", "error"];

function parseLogLevel(value: string | undefined): LogLevel {
  return LOG_LEVELS.includes(value as LogLevel) ? (value as LogLevel) : "info";
}

const currentLevel: LogLevel = parseLogLevel(process.env["LOG_LEVEL"]);

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

// Envuelve una operación asincrónica con logs de inicio y fin, incluyendo durationMs y status.
// Si la operación lanza, loguea status="error" con el código de error y propaga la excepción.
export async function withOperationLogging<T>(
  operationName: string,
  context: Record<string, unknown>,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  logger.info(`${operationName} - inicio`, context);

  try {
    const result = await operation();
    logger.info(`${operationName} - éxito`, {
      ...context,
      durationMs: Date.now() - startTime,
      status: "success",
    });
    return result;
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? (error as { code: unknown }).code
        : "UNKNOWN";
    logger.error(`${operationName} - error`, {
      ...context,
      durationMs: Date.now() - startTime,
      status: "error",
      errorCode,
    });
    throw error;
  }
}
