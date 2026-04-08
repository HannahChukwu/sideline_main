import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export type ConsumeGenerateRateResult =
  | { ok: true }
  | { ok: false; kind: "rate_limited"; retryAfterSec: number }
  | { ok: false; kind: "misconfigured" };

/** @internal */
export function clampLimitEnv(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 10_000);
}

function secondsUntilReset(resetMs: number): number {
  return Math.max(1, Math.ceil((resetMs - Date.now()) / 1000));
}

let redisClient: Redis | null | undefined;
let limiterPair: { hourly: Ratelimit; daily: Ratelimit } | undefined;

function getRedis(): Redis | null {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }
  redisClient = new Redis({ url, token });
  return redisClient;
}

function getLimiters(redis: Redis): { hourly: Ratelimit; daily: Ratelimit } {
  if (limiterPair) return limiterPair;
  const perHour = clampLimitEnv(process.env.GENERATE_RL_PER_HOUR, 15);
  const perDay = clampLimitEnv(process.env.GENERATE_RL_PER_DAY, 50);
  limiterPair = {
    hourly: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perHour, "1 h"),
      prefix: "ratelimit:generate:hour",
    }),
    daily: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(perDay, "24 h"),
      prefix: "ratelimit:generate:day",
    }),
  };
  return limiterPair;
}

/** Only for tests — resets cached Redis client and limiters. */
export function __resetGenerateRateLimitForTests(): void {
  redisClient = undefined;
  limiterPair = undefined;
}

/**
 * Consumes one generation slot against per-user hourly and daily Upstash limits.
 * Production without Upstash env → misconfigured (fail closed).
 * Non-production without Upstash → allow (local dev without Redis).
 */
export async function consumeGenerateRateLimit(userId: string): Promise<ConsumeGenerateRateResult> {
  const redis = getRedis();
  if (!redis) {
    if (process.env.NODE_ENV === "production") {
      return { ok: false, kind: "misconfigured" };
    }
    return { ok: true };
  }

  const { hourly, daily } = getLimiters(redis);
  const hourResult = await hourly.limit(userId);
  if (!hourResult.success) {
    return {
      ok: false,
      kind: "rate_limited",
      retryAfterSec: secondsUntilReset(hourResult.reset),
    };
  }
  const dayResult = await daily.limit(userId);
  if (!dayResult.success) {
    return {
      ok: false,
      kind: "rate_limited",
      retryAfterSec: secondsUntilReset(dayResult.reset),
    };
  }
  return { ok: true };
}
