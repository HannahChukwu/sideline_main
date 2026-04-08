import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const incrMock = vi.fn();
const expireMock = vi.fn();
const setMock = vi.fn();
const getMock = vi.fn();
const ttlMock = vi.fn();
const delMock = vi.fn();

vi.mock("@upstash/redis", () => ({
  Redis: class {
    constructor(_opts: unknown) {
      void _opts;
    }
    incr = incrMock;
    expire = expireMock;
    set = setMock;
    get = getMock;
    ttl = ttlMock;
    del = delMock;
  },
}));

import {
  __resetLoginLockoutForTests,
  clearLoginLockout,
  getLoginLockStatus,
  LOGIN_LOCKOUT_SECONDS,
  LOGIN_MAX_FAILURES,
  normalizeSigninEmail,
  recordPasswordSigninFailure,
  signinEmailKeyId,
} from "./loginLockout";

describe("normalizeSigninEmail / signinEmailKeyId", () => {
  it("normalizes to lowercase trimmed", () => {
    expect(normalizeSigninEmail("  Test@Example.COM \n")).toBe("test@example.com");
  });

  it("produces stable key id for same email", () => {
    expect(signinEmailKeyId("A@B.C")).toBe(signinEmailKeyId("  a@b.c  "));
  });

  it("differs for different emails", () => {
    expect(signinEmailKeyId("a@b.c")).not.toBe(signinEmailKeyId("x@y.z"));
  });
});

describe("loginLockout Redis integration (mocked)", () => {
  const origEnv = { ...process.env };

  beforeEach(() => {
    __resetLoginLockoutForTests();
    vi.clearAllMocks();
    process.env.UPSTASH_REDIS_REST_URL = "https://test.upstash.io";
    process.env.UPSTASH_REDIS_REST_TOKEN = "token";
  });

  afterEach(() => {
    __resetLoginLockoutForTests();
    process.env = { ...origEnv };
  });

  it("getLoginLockStatus reports unlocked when no lock key", async () => {
    getMock.mockResolvedValueOnce(null);
    await expect(getLoginLockStatus("u@example.com")).resolves.toEqual({ locked: false });
  });

  it("getLoginLockStatus reports locked with ttl", async () => {
    getMock.mockResolvedValueOnce("1");
    ttlMock.mockResolvedValueOnce(120);
    await expect(getLoginLockStatus("u@example.com")).resolves.toEqual({
      locked: true,
      retryAfterSec: 120,
    });
  });

  it("recordPasswordSigninFailure sets expire on first incr", async () => {
    incrMock.mockResolvedValueOnce(1);
    const r = await recordPasswordSigninFailure("u@example.com");
    expect(r).toEqual({ locked: false, failuresSoFar: 1 });
    expect(expireMock).toHaveBeenCalledTimes(1);
  });

  it("recordPasswordSigninFailure locks after LOGIN_MAX_FAILURES", async () => {
    incrMock.mockResolvedValueOnce(LOGIN_MAX_FAILURES);
    const r = await recordPasswordSigninFailure("u@example.com");
    expect(r).toMatchObject({
      locked: true,
      retryAfterSec: LOGIN_LOCKOUT_SECONDS,
    });
    expect(setMock).toHaveBeenCalledWith(
      expect.any(String),
      "1",
      expect.objectContaining({ ex: LOGIN_LOCKOUT_SECONDS })
    );
    expect(delMock).toHaveBeenCalled();
  });

  it("clearLoginLockout deletes keys", async () => {
    await clearLoginLockout("u@example.com");
    expect(delMock).toHaveBeenCalled();
  });

  it("allows all operations when Redis env missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    __resetLoginLockoutForTests();
    await expect(getLoginLockStatus("a@b.co")).resolves.toEqual({ locked: false });
    await expect(recordPasswordSigninFailure("a@b.co")).resolves.toEqual({
      locked: false,
      failuresSoFar: 0,
    });
    await clearLoginLockout("a@b.co");
    expect(incrMock).not.toHaveBeenCalled();
  });
});
