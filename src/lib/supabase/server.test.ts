import { describe, expect, it, vi } from "vitest";

const createServerClient = vi.hoisted(() =>
  vi.fn(() => ({ tag: "server-client" as const }))
);

const cookieStore = vi.hoisted(() => ({
  getAll: vi.fn(() => []),
  set: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
}));

vi.mock("@supabase/ssr", () => ({
  createServerClient,
}));

describe("createClient (server)", () => {
  it("wires cookies into createServerClient", async () => {
    createServerClient.mockClear();
    cookieStore.getAll.mockClear();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://x.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "key";

    const { createClient } = await import("./server");
    const client = await createClient();
    expect(client).toEqual({ tag: "server-client" });

    expect(createServerClient).toHaveBeenCalledWith(
      "https://x.supabase.co",
      "key",
      expect.objectContaining({
        cookies: expect.objectContaining({
          getAll: expect.any(Function),
          setAll: expect.any(Function),
        }),
      })
    );

    const opts = createServerClient.mock.calls[0]?.[2];
    expect(opts?.cookies?.getAll?.()).toEqual([]);
    opts?.cookies?.setAll?.([
      { name: "a", value: "b", options: {} },
    ]);
    expect(cookieStore.set).toHaveBeenCalledWith("a", "b", {});
  });
});
