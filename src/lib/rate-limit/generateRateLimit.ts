import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types";

export type ConsumeGenerateRateResult =
  | { ok: true }
  | { ok: false; kind: "rate_limited"; retryAfterSec: number }
  | { ok: false; kind: "misconfigured"; detail?: string };

/** @internal */
export function clampLimitEnv(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? "", 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, 10_000);
}

type RpcPayload = {
  ok?: boolean;
  reason?: string;
  retry_after_sec?: number;
};

function parseRpcPayload(data: unknown): RpcPayload | null {
  if (!data || typeof data !== "object") return null;
  const o = data as Record<string, unknown>;
  return {
    ok: typeof o.ok === "boolean" ? o.ok : undefined,
    reason: typeof o.reason === "string" ? o.reason : undefined,
    retry_after_sec: typeof o.retry_after_sec === "number" ? o.retry_after_sec : undefined,
  };
}

/**
 * Consumes one generation slot using Supabase Postgres (`consume_generation_rate_limit` RPC).
 * Fixed calendar buckets: `date_trunc('hour'|'day', now())` in the database (Supabase defaults to UTC).
 *
 * `SKIP_GENERATE_RATE_LIMIT=1` or `true` bypasses limits (trusted local tests only).
 */
export async function consumeGenerateRateLimit(
  supabase: SupabaseClient<Database>
): Promise<ConsumeGenerateRateResult> {
  const skip =
    process.env.SKIP_GENERATE_RATE_LIMIT === "1" ||
    process.env.SKIP_GENERATE_RATE_LIMIT === "true";
  if (skip) {
    return { ok: true };
  }

  const perHour = clampLimitEnv(process.env.GENERATE_RL_PER_HOUR, 15);
  const perDay = clampLimitEnv(process.env.GENERATE_RL_PER_DAY, 50);

  const { data, error } = await supabase.rpc("consume_generation_rate_limit", {
    p_per_hour: perHour,
    p_per_day: perDay,
  });

  if (error) {
    const msg = error.message ?? String(error);
    return {
      ok: false,
      kind: "misconfigured",
      detail: msg,
    };
  }

  const payload = parseRpcPayload(data);
  if (!payload || typeof payload.ok !== "boolean") {
    return {
      ok: false,
      kind: "misconfigured",
      detail: "Unexpected response from consume_generation_rate_limit",
    };
  }

  if (payload.ok) {
    return { ok: true };
  }

  if (payload.reason === "not_authenticated") {
    return { ok: false, kind: "misconfigured", detail: "Rate limit RPC lost session context" };
  }

  const retry = Math.max(1, Math.min(payload.retry_after_sec ?? 60, 86400));
  return { ok: false, kind: "rate_limited", retryAfterSec: retry };
}
