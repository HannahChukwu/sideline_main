import crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { decryptString, encryptString } from "./tokenCrypto";

describe("tokenCrypto", () => {
  const prev = process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;

  beforeEach(() => {
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = crypto.randomBytes(32).toString("base64");
  });

  afterEach(() => {
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = prev;
  });

  it("round-trips utf-8 text", () => {
    const plain = "token-abc-🔐";
    expect(decryptString(encryptString(plain))).toBe(plain);
  });

  it("throws when key env is missing", () => {
    delete process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY;
    expect(() => encryptString("x")).toThrow(/INSTAGRAM_TOKEN_ENCRYPTION_KEY/);
  });

  it("throws when key is not 32 bytes", () => {
    process.env.INSTAGRAM_TOKEN_ENCRYPTION_KEY = Buffer.from("short").toString("base64");
    expect(() => encryptString("x")).toThrow(/32 bytes/);
  });

  it("throws on invalid ciphertext shape", () => {
    expect(() => decryptString("not-three-parts")).toThrow(/Invalid encrypted/);
    expect(() => decryptString("a.b")).toThrow(/Invalid encrypted/);
  });
});
