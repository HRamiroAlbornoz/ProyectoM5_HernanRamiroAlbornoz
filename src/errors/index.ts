export type ErrorCode =
  | "VALIDATION_ERROR"
  | "AUTHENTICATION_ERROR"
  | "GITHUB_API_ERROR"
  | "NETWORK_ERROR"
  | "UNKNOWN_ERROR";

export type ErrorAction =
  | "FIX_INPUT"
  | "REQUEST_CREDENTIALS"
  | "WAIT_AND_RETRY"
  | "ESCALATE";

export class AppError extends Error {
  readonly code: ErrorCode;
  readonly retryable: boolean;
  readonly action: ErrorAction;
  readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: ErrorCode,
    retryable: boolean,
    action: ErrorAction,
    details: Record<string, unknown> | undefined,
    cause?: unknown
  ) {
    super(message, { cause });
    this.name = "AppError";
    this.code = code;
    this.retryable = retryable;
    this.action = action;
    if (details !== undefined) {
      this.details = details;
    }
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "VALIDATION_ERROR", false, "FIX_INPUT", details);
    this.name = "ValidationError";
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, "AUTHENTICATION_ERROR", false, "REQUEST_CREDENTIALS", details);
    this.name = "AuthenticationError";
  }
}

export class GitHubAPIError extends AppError {
  readonly status: number;

  constructor(
    message: string,
    status: number,
    retryable: boolean,
    action: ErrorAction,
    details?: Record<string, unknown>,
    cause?: unknown
  ) {
    super(message, "GITHUB_API_ERROR", retryable, action, details, cause);
    this.name = "GitHubAPIError";
    this.status = status;
  }
}

export class NetworkError extends AppError {
  constructor(message: string, cause?: unknown) {
    super(message, "NETWORK_ERROR", true, "WAIT_AND_RETRY", undefined, cause);
    this.name = "NetworkError";
  }
}

export function mapGitHubError(error: unknown, resourceName?: string): AppError {
  if (error instanceof AppError) return error;

  if (typeof error === "object" && error !== null && "status" in error) {
    const err = error as { status: number; message?: string };
    const status = err.status;

    if (status === 401) {
      return new AuthenticationError(
        "Token de GitHub inválido o expirado. Generá uno nuevo en https://github.com/settings/tokens con los scopes: repo, user, admin:org."
      );
    }

    if (status === 403) {
      const message = err.message ?? "";
      if (message.toLowerCase().includes("rate limit")) {
        return new GitHubAPIError(
          "Se superó el límite de peticiones a la API de GitHub. Esperá unos minutos e intentá de nuevo.",
          403,
          true,
          "WAIT_AND_RETRY",
          undefined,
          error
        );
      }
      return new GitHubAPIError(
        "No tenés permisos para realizar esta operación. Verificá los scopes del token de GitHub.",
        403,
        false,
        "REQUEST_CREDENTIALS",
        undefined,
        error
      );
    }

    if (status === 404) {
      const name = resourceName ?? "El recurso";
      return new GitHubAPIError(
        `${name} no fue encontrado. Verificá el nombre e intentá de nuevo.`,
        404,
        false,
        "FIX_INPUT",
        undefined,
        error
      );
    }

    if (status === 422) {
      return new GitHubAPIError(
        "Los datos enviados no son válidos para GitHub. Verificá los parámetros e intentá de nuevo.",
        422,
        false,
        "FIX_INPUT",
        undefined,
        error
      );
    }

    if (status === 429) {
      return new GitHubAPIError(
        "Demasiadas peticiones a la API de GitHub. Esperá unos minutos e intentá de nuevo.",
        429,
        true,
        "WAIT_AND_RETRY",
        undefined,
        error
      );
    }

    if (status >= 500) {
      return new GitHubAPIError(
        "Error interno en los servidores de GitHub. Intentá de nuevo en unos minutos.",
        status,
        true,
        "WAIT_AND_RETRY",
        undefined,
        error
      );
    }
  }

  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: string }).code === "ENOTFOUND"
  ) {
    return new NetworkError(
      "No se pudo conectar con GitHub. Verificá tu conexión a internet.",
      error
    );
  }

  return new AppError(
    "Ocurrió un error inesperado. Intentá de nuevo.",
    "UNKNOWN_ERROR",
    false,
    "ESCALATE",
    undefined,
    error
  );
}
