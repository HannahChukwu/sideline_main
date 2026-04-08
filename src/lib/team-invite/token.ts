import { createHmac, timingSafeEqual } from "crypto";

export const TEAM_INVITE_TTL_SEC = 14 * 24 * 60 * 60; // 14 days

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type TeamInvitePayload = {
  team_id: string;
  exp: number;
};

function getSecret(): string {
  const s = process.env.TEAM_INVITE_SECRET?.trim();
  if (s && s.length >= 16) return s;
  if (process.env.NODE_ENV === "development") {
    return "dev-team-invite-secret-min-16-chars";
  }
  throw new Error("TEAM_INVITE_SECRET is not set or too short (need at least 16 characters).");
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function b64urlDecode(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

export function signTeamInviteToken(teamId: string, ttlSec: number = TEAM_INVITE_TTL_SEC): string {
  if (!UUID_RE.test(teamId)) throw new Error("Invalid team id");
  const payload: TeamInvitePayload = {
    team_id: teamId,
    exp: Math.floor(Date.now() / 1000) + ttlSec,
  };
  const payloadStr = JSON.stringify(payload);
  const payloadB64 = b64url(Buffer.from(payloadStr, "utf8"));
  const sig = createHmac("sha256", getSecret()).update(payloadB64).digest();
  const sigB64 = b64url(sig);
  return `${payloadB64}.${sigB64}`;
}

export function verifyTeamInviteToken(token: string): TeamInvitePayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) return null;

  let sig: Buffer;
  try {
    sig = b64urlDecode(sigB64);
  } catch {
    return null;
  }

  const expected = createHmac("sha256", getSecret()).update(payloadB64).digest();
  if (sig.length !== expected.length || !timingSafeEqual(sig, expected)) return null;

  let payload: unknown;
  try {
    const raw = b64urlDecode(payloadB64).toString("utf8");
    payload = JSON.parse(raw) as unknown;
  } catch {
    return null;
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as TeamInvitePayload).team_id !== "string" ||
    typeof (payload as TeamInvitePayload).exp !== "number"
  ) {
    return null;
  }

  const { team_id, exp } = payload as TeamInvitePayload;
  if (!UUID_RE.test(team_id)) return null;
  if (exp <= Math.floor(Date.now() / 1000)) return null;

  return { team_id, exp };
}
