import { afterEach, describe, expect, it } from "vitest";
import { signTeamInviteToken, verifyTeamInviteToken, TEAM_INVITE_TTL_SEC } from "./token";

describe("team invite token", () => {
  afterEach(() => {
    delete process.env.TEAM_INVITE_SECRET;
  });

  it("round-trips and extracts team_id", () => {
    process.env.TEAM_INVITE_SECRET = "test-secret-at-least-16";
    const teamId = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee";
    const t = signTeamInviteToken(teamId, TEAM_INVITE_TTL_SEC);
    const p = verifyTeamInviteToken(t);
    expect(p?.team_id).toBe(teamId);
  });

  it("rejects tampered token", () => {
    process.env.TEAM_INVITE_SECRET = "test-secret-at-least-16";
    const teamId = "aaaaaaaa-bbbb-4ccc-bddd-eeeeeeeeeeee";
    const t = signTeamInviteToken(teamId);
    const tampered = t.slice(0, -4) + "xxxx";
    expect(verifyTeamInviteToken(tampered)).toBeNull();
  });
});
