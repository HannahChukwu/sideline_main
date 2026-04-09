import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";
import { clampLimitEnv, consumeGenerateRateLimit } from "./generateRateLimit";

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

function mockSupabase(rpc: ReturnType<typeof vi.fn>): SupabaseClient<Database> {
  return { rpc } as unknown as SupabaseClient<Database>;
}

describe("consumeGenerateRateLimit", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    vi.resetAllMocks();
    delete process.env.SKIP_GENERATE_RATE_LIMIT;
    process.env.GENERATE_RL_PER_HOUR = "15";
    process.env.GENERATE_RL_PER_DAY = "50";
  });

  afterEach(() => {
    process.env = { ...origEnv };
  });

  it("allows when SKIP_GENERATE_RATE_LIMIT is set", async () => {
    process.env.SKIP_GENERATE_RATE_LIMIT = "1";
    const rpc = vi.fn();
    const result = await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(result).toEqual({ ok: true });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("allows when RPC returns ok true", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, reason: "ok", retry_after_sec: 0 },
      error: null,
    });
    const result = await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(result).toEqual({ ok: true });
    expect(rpc).toHaveBeenCalledWith("consume_generation_rate_limit", {
      p_per_hour: 15,
      p_per_day: 50,
    });
  });

  it("returns rate_limited when RPC returns ok false with retry", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: false, reason: "hour", retry_after_sec: 42 },
      error: null,
    });
    const result = await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(result).toEqual({ ok: false, kind: "rate_limited", retryAfterSec: 42 });
  });

  it("returns misconfigured when RPC errors", async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: null,
      error: { message: "function not found" },
    });
    const result = await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(result).toEqual({
      ok: false,
      kind: "misconfigured",
      detail: "function not found",
    });
  });

  it("returns misconfigured when payload is invalid", async () => {
    const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
    const result = await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(result).toMatchObject({ ok: false, kind: "misconfigured" });
  });

  it("uses env overrides for limits", async () => {
    process.env.GENERATE_RL_PER_HOUR = "3";
    process.env.GENERATE_RL_PER_DAY = "10";
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, reason: "ok", retry_after_sec: 0 },
      error: null,
    });
    await consumeGenerateRateLimit(mockSupabase(rpc));
    expect(rpc).toHaveBeenCalledWith("consume_generation_rate_limit", {
      p_per_hour: 3,
      p_per_day: 10,
    });
  });
});
