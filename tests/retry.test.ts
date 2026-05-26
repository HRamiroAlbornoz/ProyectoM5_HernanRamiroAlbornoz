import { describe, it, expect, vi } from "vitest";
import { withRetry } from "../src/utils/retry.js";
import {
  GitHubAPIError,
  ValidationError,
  NetworkError,
  AppError,
} from "../src/errors/index.js";

describe("withRetry", () => {
  it("retorna el resultado en el primer intento si la operación es exitosa", async () => {
    const operation = vi.fn().mockResolvedValue("resultado-exitoso");

    const result = await withRetry(operation);

    expect(result).toBe("resultado-exitoso");
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("reintenta operaciones que fallan con errores reintentables", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 500, message: "Server Error" })
      .mockResolvedValueOnce("resultado-tras-reintento");

    const result = await withRetry(operation, { baseDelayMs: 1, maxDelayMs: 10 });

    expect(result).toBe("resultado-tras-reintento");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("no reintenta errores no reintentables (ej: ValidationError)", async () => {
    const operation = vi.fn().mockRejectedValue(new ValidationError("Input inválido."));

    const error = await withRetry(operation).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ValidationError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("no reintenta errores 404 (no reintentables)", async () => {
    const operation = vi.fn().mockRejectedValue({ status: 404, message: "Not Found" });

    const error = await withRetry(operation).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it("falla después de agotar maxAttempts en errores reintentables", async () => {
    const operation = vi.fn().mockRejectedValue({ status: 500, message: "Server Error" });

    const error = await withRetry(operation, {
      maxAttempts: 3,
      baseDelayMs: 1,
      maxDelayMs: 10,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(GitHubAPIError);
    expect((error as GitHubAPIError).retryable).toBe(true);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("reintenta errores de red (ENOTFOUND)", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ code: "ENOTFOUND", message: "DNS fail" })
      .mockResolvedValueOnce("ok");

    const result = await withRetry(operation, { baseDelayMs: 1, maxDelayMs: 10 });

    expect(result).toBe("ok");
    expect(operation).toHaveBeenCalledTimes(2);
  });

  it("aplica backoff exponencial entre intentos", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 500 })
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce("ok");

    const startTime = Date.now();
    await withRetry(operation, {
      maxAttempts: 3,
      baseDelayMs: 50,
      maxDelayMs: 1000,
    });
    const elapsed = Date.now() - startTime;

    // Primer reintento: ~50ms. Segundo reintento: ~100ms. Total mínimo: ~150ms.
    expect(elapsed).toBeGreaterThanOrEqual(140);
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it("respeta el maxDelayMs como tope superior del backoff", async () => {
    const operation = vi
      .fn()
      .mockRejectedValueOnce({ status: 500 })
      .mockResolvedValueOnce("ok");

    const startTime = Date.now();
    await withRetry(operation, {
      maxAttempts: 3,
      baseDelayMs: 10000,
      maxDelayMs: 50,
    });
    const elapsed = Date.now() - startTime;

    // El delay base sería 10000ms, pero maxDelayMs lo limita a 50ms.
    expect(elapsed).toBeLessThan(500);
  });

  it("preserva el tipo de AppError tras agotar reintentos", async () => {
    const networkError = new NetworkError("Sin conexión.");
    const operation = vi.fn().mockRejectedValue(networkError);

    const error = await withRetry(operation, {
      maxAttempts: 2,
      baseDelayMs: 1,
      maxDelayMs: 10,
    }).catch((e: unknown) => e);

    expect(error).toBeInstanceOf(NetworkError);
    expect((error as AppError).code).toBe("NETWORK_ERROR");
  });
});
