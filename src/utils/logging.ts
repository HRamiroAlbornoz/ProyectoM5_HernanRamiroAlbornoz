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

// Claves de campos sensibles que deben ser redactadas antes de loguear.
const SENSITIVE_KEYS: ReadonlyArray<string> = [
  "token",
  "password",
  "secret",
  "apikey",
  "authorization",
];

// Redacta valores de claves sensibles para evitar exponer credenciales en los logs.
export function sanitizeLogData(
  data: Record<string, unknown> | undefined
): Record<string, unknown> | undefined {
  if (data === undefined) return undefined;

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    sanitized[key] = SENSITIVE_KEYS.includes(key.toLowerCase()) ? "[REDACTED]" : value;
  }
  return sanitized;
}

function writeLog(level: LogLevel, message: string, data?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const sanitized = sanitizeLogData(data);

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(sanitized !== undefined && { data: sanitized }),
  };

  process.stderr.write(JSON.stringify(entry) + "\n");
}

export const logger = {
  debug: (message: string, data?: Record<string, unknown>) => writeLog("debug", message, data),
  info: (message: string, data?: Record<string, unknown>) => writeLog("info", message, data),
  warn: (message: string, data?: Record<string, unknown>) => writeLog("warn", message, data),
  error: (message: string, data?: Record<string, unknown>) => writeLog("error", message, data),
};

// Genera un ID corto y único para correlacionar logs de la misma operación.
export function generateRequestId(): string {
  return `op_${Math.random().toString(36).slice(2, 10)}`;
}

// Envuelve una operación asincrónica con logs de inicio y fin, incluyendo durationMs, status y requestId.
// El requestId permite correlacionar logs de la misma operación cuando hay llamadas concurrentes.
// Si la operación lanza, loguea status="error" con el código de error y propaga la excepción.
export async function withOperationLogging<T>(
  operationName: string,
  context: Record<string, unknown>,
  operation: () => Promise<T>
): Promise<T> {
  const startTime = Date.now();
  const requestId = generateRequestId();
  const baseContext = { requestId, ...context };

  logger.info(`${operationName} - inicio`, baseContext);

  try {
    const result = await operation();
    logger.info(`${operationName} - éxito`, {
      ...baseContext,
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
      ...baseContext,
      durationMs: Date.now() - startTime,
      status: "error",
      errorCode,
    });
    throw error;
  }
}
