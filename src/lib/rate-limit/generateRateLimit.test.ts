import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const limitMock = vi.fn();

vi.mock("@upstash/ratelimit", () => {
  const slidingWindow = vi.fn(() => ({}));
  class Ratelimit {
    constructor(_opts: unknown) {
      void _opts;
    }
    limit = (id: string) => limitMock(id);
    static slidingWindow = slidingWindow;
  }
  return { Ratelimit };
});

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(_opts: unknown) {
      void _opts;
    }
  },
}));

import {
  __resetGenerateRateLimitForTests,
  clampLimitEnv,
  consumeGenerateRateLimit,
} from "./generateRateLimit";

describe("clampLimitEnv", () => {
  it("uses fallback for invalid or empty", () => {
    expect(clampLimitEnv(undefined, 15)).toBe(15);
    expect(clampLimitEnv("", 15)).toBe(15);
    expect(clampLimitEnv("abc", 15)).toBe(15);
    expect(clampLimitEnv("0", 15)).toBe(15);
  });

  it("parses positive integers", () => {
    expect(clampLimitEnv("20", 15)).toBe(20);
    expect(clampLimitEnv("1", 15)).toBe(1);
  });

  it("caps at 10000", () => {
    expect(clampLimitEnv("999999", 15)).toBe(10_000);
  });
});

describe("consumeGenerateRateLimit", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    __resetGenerateRateLimitForTests();
    limitMock.mockReset();
    process.env.UPSTASH_REDIS_REST_URL = "https://example.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  });

  afterEach(() => {
    __resetGenerateRateLimitForTests();
    process.env = { ...origEnv };
  });

  it("allows when both windows succeed (non-production behaves like Redis configured)", async () => {
    process.env.NODE_ENV = "test";
    limitMock
      .mockResolvedValueOnce({ success: true, reset: Date.now() + 60_000 })
      .mockResolvedValueOnce({ success: true, reset: Date.now() + 60_000 });

    const result = await consumeGenerateRateLimit("user-1");
    expect(result).toEqual({ ok: true });
    expect(limitMock).toHaveBeenCalledTimes(2);
    expect(limitMock).toHaveBeenCalledWith("user-1");
  });

  it("returns rate_limited when hourly window fails", async () => {
    process.env.NODE_ENV = "test";
    const reset = Date.now() + 45_000;
    limitMock.mockResolvedValueOnce({ success: false, reset });

    const result = await consumeGenerateRateLimit("u2");
    expect(result).toMatchObject({
      ok: false,
      kind: "rate_limited",
      retryAfterSec: expect.any(Number),
    });
    if (result.ok === false && result.kind === "rate_limited") {
      expect(result.retryAfterSec).toBeGreaterThanOrEqual(1);
    }
    expect(limitMock).toHaveBeenCalledTimes(1);
  });

  it("returns rate_limited when daily window fails after hourly passes", async () => {
    process.env.NODE_ENV = "test";
    const reset = Date.now() + 90_000;
    limitMock
      .mockResolvedValueOnce({ success: true, reset: Date.now() + 60_000 })
      .mockResolvedValueOnce({ success: false, reset });

    const result = await consumeGenerateRateLimit("u3");
    expect(result.ok).toBe(false);
    if (result.ok === false) expect(result.kind).toBe("rate_limited");
    expect(limitMock).toHaveBeenCalledTimes(2);
  });

  it("returns misconfigured in production when Upstash env is missing", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    __resetGenerateRateLimitForTests();

    const result = await consumeGenerateRateLimit("u4");
    expect(result).toEqual({ ok: false, kind: "misconfigured" });
    expect(limitMock).not.toHaveBeenCalled();
  });

  it("allows in non-production when Upstash env is missing", async () => {
    process.env.NODE_ENV = "development";
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    __resetGenerateRateLimitForTests();

    const result = await consumeGenerateRateLimit("u5");
    expect(result).toEqual({ ok: true });
    expect(limitMock).not.toHaveBeenCalled();
  });
});
