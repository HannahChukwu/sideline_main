import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

export const LOGIN_MAX_FAILURES = 5;
export const LOGIN_LOCKOUT_SECONDS = 10 * 60; // 10 minutes
export const LOGIN_FAIL_WINDOW_SECONDS = 15 * 60; // reset failure count if idle this long

const KEY_PREFIX = "login:v1";

let redisSingleton: Redis | null | undefined;

function getRedis(): Redis | null {
  if (redisSingleton !== undefined) return redisSingleton;
  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisSingleton = null;
    return null;
  }
  redisSingleton = new Redis({ url, token });
  return redisSingleton;
}

/** @internal */
export function __resetLoginLockoutForTests(): void {
  redisSingleton = undefined;
}

export function normalizeSigninEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function signinEmailKeyId(email: string): string {
  const normalized = normalizeSigninEmail(email);
  return createHash("sha256").update(normalized).digest("hex");
}

function lockKey(id: string): string {
  return `${KEY_PREFIX}:lock:${id}`;
}

function failsKey(id: string): string {
  return `${KEY_PREFIX}:fails:${id}`;
}

export type LoginLockStatus =
  | { locked: false }
  | { locked: true; retryAfterSec: number };

export async function getLoginLockStatus(email: string): Promise<LoginLockStatus> {
  const redis = getRedis();
  if (!redis) return { locked: false };

  const id = signinEmailKeyId(email);
  const locked = await redis.get(lockKey(id));
  if (!locked) return { locked: false };

  const ttl = await redis.ttl(lockKey(id));
  return { locked: true, retryAfterSec: ttl > 0 ? ttl : LOGIN_LOCKOUT_SECONDS };
}

export type RecordFailureResult =
  | { locked: false; failuresSoFar: number }
  | { locked: true; retryAfterSec: number };

/**
 * Increment failed-attempt counter for this email. After LOGIN_MAX_FAILURES,
 * sets a lock for LOGIN_LOCKOUT_SECONDS and clears the counter.
 */
export async function recordPasswordSigninFailure(email: string): Promise<RecordFailureResult> {
  const redis = getRedis();
  if (!redis) return { locked: false, failuresSoFar: 0 };

  const id = signinEmailKeyId(email);
  const fKey = failsKey(id);
  const lKey = lockKey(id);

  const n = await redis.incr(fKey);
  if (n === 1) {
    await redis.expire(fKey, LOGIN_FAIL_WINDOW_SECONDS);
  }

  if (n >= LOGIN_MAX_FAILURES) {
    await redis.set(lKey, "1", { ex: LOGIN_LOCKOUT_SECONDS });
    await redis.del(fKey);
    return { locked: true, retryAfterSec: LOGIN_LOCKOUT_SECONDS };
  }

  return { locked: false, failuresSoFar: n };
}

export async function clearLoginLockout(email: string): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  const id = signinEmailKeyId(email);
  await redis.del(lockKey(id), failsKey(id));
}
