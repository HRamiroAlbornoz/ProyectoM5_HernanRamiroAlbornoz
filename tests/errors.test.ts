import { describe, it, expect } from "vitest";
import {
  mapGitHubError,
  ValidationError,
  AuthenticationError,
  GitHubAPIError,
  NetworkError,
  AppError,
} from "../src/errors/index.js";

describe("mapGitHubError", () => {
  it("retorna el mismo AppError si ya es una instancia de AppError", () => {
    const original = new ValidationError("Input inválido.");
    const result = mapGitHubError(original);
    expect(result).toBe(original);
  });

  it("mapea error 401 a AuthenticationError con mensaje accionable", () => {
    const error = { status: 401, message: "Unauthorized" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(AuthenticationError);
    expect(result.code).toBe("AUTHENTICATION_ERROR");
    expect(result.retryable).toBe(false);
    expect(result.message).toContain("Token de GitHub inválido");
  });

  it("mapea error 403 con rate limit a GitHubAPIError reintentable", () => {
    const error = { status: 403, message: "rate limit exceeded" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(true);
    expect(result.action).toBe("WAIT_AND_RETRY");
  });

  it("mapea error 403 sin rate limit a GitHubAPIError no reintentable", () => {
    const error = { status: 403, message: "Forbidden" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(false);
    expect(result.action).toBe("REQUEST_CREDENTIALS");
  });

  it("mapea error 404 a GitHubAPIError con nombre del recurso en el mensaje", () => {
    const error = { status: 404, message: "Not Found" };
    const result = mapGitHubError(error, 'El repositorio "mi-repo"');
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.code).toBe("GITHUB_API_ERROR");
    expect(result.retryable).toBe(false);
    expect(result.message).toContain("mi-repo");
    expect(result.message).toContain("no fue encontrado");
  });

  it("mapea error 422 a GitHubAPIError no reintentable", () => {
    const error = { status: 422, message: "Unprocessable Entity" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(false);
    expect(result.action).toBe("FIX_INPUT");
  });

  it("mapea error 429 a GitHubAPIError reintentable", () => {
    const error = { status: 429, message: "Too Many Requests" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(true);
    expect(result.action).toBe("WAIT_AND_RETRY");
  });

  it("mapea error 500 a GitHubAPIError reintentable", () => {
    const error = { status: 500, message: "Internal Server Error" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(GitHubAPIError);
    expect(result.retryable).toBe(true);
    expect(result.action).toBe("WAIT_AND_RETRY");
  });

  it("mapea error ENOTFOUND a NetworkError", () => {
    const error = { code: "ENOTFOUND", message: "getaddrinfo ENOTFOUND" };
    const result = mapGitHubError(error);
    expect(result).toBeInstanceOf(NetworkError);
    expect(result.code).toBe("NETWORK_ERROR");
    expect(result.retryable).toBe(true);
  });

  it("mapea error desconocido a AppError con código UNKNOWN_ERROR", () => {
    const result = mapGitHubError("error inesperado");
    expect(result).toBeInstanceOf(AppError);
    expect(result.code).toBe("UNKNOWN_ERROR");
    expect(result.retryable).toBe(false);
    expect(result.action).toBe("ESCALATE");
  });
});

describe("ValidationError", () => {
  it("tiene código VALIDATION_ERROR y no es reintentable", () => {
    const error = new ValidationError("El campo es inválido.");
    expect(error.code).toBe("VALIDATION_ERROR");
    expect(error.retryable).toBe(false);
    expect(error.action).toBe("FIX_INPUT");
    expect(error.message).toBe("El campo es inválido.");
  });
});

describe("AuthenticationError", () => {
  it("tiene código AUTHENTICATION_ERROR y no es reintentable", () => {
    const error = new AuthenticationError("Token inválido.");
    expect(error.code).toBe("AUTHENTICATION_ERROR");
    expect(error.retryable).toBe(false);
    expect(error.action).toBe("REQUEST_CREDENTIALS");
  });
});

describe("NetworkError", () => {
  it("tiene código NETWORK_ERROR y es reintentable", () => {
    const error = new NetworkError("Sin conexión.");
    expect(error.code).toBe("NETWORK_ERROR");
    expect(error.retryable).toBe(true);
    expect(error.action).toBe("WAIT_AND_RETRY");
  });
});
