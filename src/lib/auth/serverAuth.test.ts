import { describe, expect, it, vi } from "vitest";
import {
  canManageTeam,
  getAuthenticatedUser,
  getUserRole,
  userHasRole,
} from "./serverAuth";

function createSupabaseStub(opts?: {
  user?: { id: string } | null;
  authError?: unknown;
  profile?: { role: "designer" | "athlete" | "student" } | null;
  profileError?: unknown;
  teamRow?: { schools?: { manager_id: string } } | null;
  teamError?: unknown;
}) {
  const profileMaybeSingle = vi.fn().mockResolvedValue({
    data: opts?.profile ?? null,
    error: opts?.profileError ?? null,
  });
  const teamMaybeSingle = vi.fn().mockResolvedValue({
    data: opts?.teamRow ?? null,
    error: opts?.teamError ?? null,
  });

  const from = vi.fn((table: string) => {
    if (table === "profiles") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: profileMaybeSingle,
          })),
        })),
      };
    }
    if (table === "teams") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: teamMaybeSingle,
          })),
        })),
      };
    }
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        })),
      })),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: opts?.user ?? null },
        error: opts?.authError ?? null,
      }),
    },
    from,
    __mocks: { from, profileMaybeSingle, teamMaybeSingle },
  };
}

describe("serverAuth helpers", () => {
  it("returns authenticated user when present", async () => {
    const supabase = createSupabaseStub({ user: { id: "u1" } });
    await expect(getAuthenticatedUser(supabase as never)).resolves.toEqual({ id: "u1" });
  });

  it("returns null user when auth call errors", async () => {
    const supabase = createSupabaseStub({
      user: { id: "u1" },
      authError: new Error("boom"),
    });
    await expect(getAuthenticatedUser(supabase as never)).resolves.toBeNull();
  });

  it("loads role from profile", async () => {
    const supabase = createSupabaseStub({
      profile: { role: "designer" },
      teamRow: { schools: { manager_id: "u1" } },
    });
    await expect(getUserRole(supabase as never, "u1")).resolves.toBe("designer");
  });

  it("returns null role when profile is missing", async () => {
    const supabase = createSupabaseStub({
      profile: null,
      teamRow: { schools: { manager_id: "u1" } },
    });
    await expect(getUserRole(supabase as never, "u1")).resolves.toBeNull();
  });

  it("checks expected role", async () => {
    const supabase = createSupabaseStub({
      profile: { role: "athlete" },
      teamRow: { schools: { manager_id: "u1" } },
    });
    await expect(userHasRole(supabase as never, "u1", "athlete")).resolves.toBe(true);
    await expect(userHasRole(supabase as never, "u1", "designer")).resolves.toBe(false);
  });

  it("allows team management for owner", async () => {
    const supabase = createSupabaseStub({
      teamRow: { schools: { manager_id: "owner-1" } },
    });

    await expect(canManageTeam(supabase as never, "owner-1", "team-1")).resolves.toBe(true);
  });

  it("denies team management for non-owner or missing row", async () => {
    const supabase = createSupabaseStub({
      teamRow: { schools: { manager_id: "owner-2" } },
    });
    await expect(canManageTeam(supabase as never, "owner-1", "team-1")).resolves.toBe(false);
  });

  it("denies team management when team row missing", async () => {
    const supabase = createSupabaseStub({ teamRow: null });
    await expect(canManageTeam(supabase as never, "owner-1", "team-1")).resolves.toBe(false);
  });
});
