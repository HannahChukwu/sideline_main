import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const createBrowserClient = vi.hoisted(() =>
  vi.fn(() => ({ tag: "browser-client" as const }))
);

vi.mock("@supabase/ssr", () => ({
  createBrowserClient,
}));

describe("createClient (browser)", () => {
  const env = { ...process.env };

  beforeEach(() => {
    createBrowserClient.mockClear();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("calls createBrowserClient with URL and anon key", async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://proj.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon";
    const { createClient } = await import("./client");
    const client = createClient();
    expect(client).toEqual({ tag: "browser-client" });
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://proj.supabase.co",
      "anon"
    );
  });

  it("falls back to placeholders when env missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const { createClient } = await import("./client");
    createClient();
    expect(createBrowserClient).toHaveBeenCalledWith(
      "https://placeholder.supabase.co",
      "placeholder-key"
    );
  });
});
