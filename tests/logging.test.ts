import { describe, it, expect } from "vitest";
import {
  sanitizeLogData,
  generateRequestId,
} from "../src/utils/logging.js";

describe("sanitizeLogData", () => {
  it("retorna undefined cuando recibe undefined", () => {
    expect(sanitizeLogData(undefined)).toBeUndefined();
  });

  it("retorna un objeto vacío cuando recibe un objeto vacío", () => {
    expect(sanitizeLogData({})).toEqual({});
  });

  it("preserva campos no sensibles sin modificar", () => {
    const result = sanitizeLogData({ owner: "usuario", repo: "mi-repo", limit: 10 });
    expect(result).toEqual({ owner: "usuario", repo: "mi-repo", limit: 10 });
  });

  it("redacta el campo 'token'", () => {
    const result = sanitizeLogData({ owner: "usuario", token: "ghp_secret" });
    expect(result).toEqual({ owner: "usuario", token: "[REDACTED]" });
  });

  it("redacta el campo 'password'", () => {
    const result = sanitizeLogData({ user: "x", password: "12345" });
    expect(result?.["password"]).toBe("[REDACTED]");
  });

  it("redacta el campo 'secret'", () => {
    const result = sanitizeLogData({ secret: "mi-secreto" });
    expect(result?.["secret"]).toBe("[REDACTED]");
  });

  it("redacta el campo 'apiKey' (case-insensitive)", () => {
    const result = sanitizeLogData({ apiKey: "key-123" });
    expect(result?.["apiKey"]).toBe("[REDACTED]");
  });

  it("redacta el campo 'authorization'", () => {
    const result = sanitizeLogData({ authorization: "Bearer abc" });
    expect(result?.["authorization"]).toBe("[REDACTED]");
  });

  it("redacta múltiples campos sensibles a la vez", () => {
    const result = sanitizeLogData({
      owner: "usuario",
      token: "ghp_x",
      password: "p123",
      repo: "mi-repo",
    });
    expect(result).toEqual({
      owner: "usuario",
      token: "[REDACTED]",
      password: "[REDACTED]",
      repo: "mi-repo",
    });
  });
});

describe("generateRequestId", () => {
  it("genera un ID con el prefijo 'op_'", () => {
    const id = generateRequestId();
    expect(id).toMatch(/^op_/);
  });

  it("genera IDs distintos en llamadas sucesivas", () => {
    const ids = new Set([
      generateRequestId(),
      generateRequestId(),
      generateRequestId(),
      generateRequestId(),
      generateRequestId(),
    ]);
    expect(ids.size).toBe(5);
  });

  it("genera IDs con longitud razonable (entre 5 y 20 caracteres)", () => {
    const id = generateRequestId();
    expect(id.length).toBeGreaterThanOrEqual(5);
    expect(id.length).toBeLessThanOrEqual(20);
  });
});
