import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  GENERATED_POSTERS_BUCKET,
  GENERATION_REFERENCES_BUCKET,
  uploadGenerationReference,
  uploadGeneratedPosterFromUrl,
} from "./referenceUpload";

describe("uploadGenerationReference", () => {
  it("rejects disallowed mime types", async () => {
    const supabase = {} as SupabaseClient;
    const file = new File([""], "x.txt", { type: "text/plain" });
    await expect(
      uploadGenerationReference(supabase, "user-1", file)
    ).rejects.toThrow(/JPEG|PNG|GIF|WebP/);
  });

  it("rejects oversize files", async () => {
    const supabase = {} as SupabaseClient;
    const buf = new Uint8Array(5 * 1024 * 1024 + 1);
    const file = new File([buf], "big.jpg", { type: "image/jpeg" });
    await expect(
      uploadGenerationReference(supabase, "user-1", file)
    ).rejects.toThrow(/5MB/);
  });

  it.each([
    ["image/png", "png"],
    ["image/gif", "gif"],
    ["image/webp", "webp"],
  ] as const)("uploads %s with .%s extension", async (mime, ext) => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: `https://ex/${ext}` },
    }));
    const from = vi.fn(() => ({ upload, getPublicUrl }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;
    const file = new File([""], `r.${ext}`, { type: mime });
    const url = await uploadGenerationReference(supabase, "u", file);
    expect(url).toBe(`https://ex/${ext}`);
    expect(upload.mock.calls[0]?.[0]).toMatch(new RegExp(`\\.${ext}$`));
  });

  it("uploads jpeg and returns public URL", async () => {
    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: "https://example.com/storage/obj.jpg" },
    }));
    const from = vi.fn(() => ({ upload, getPublicUrl }));
    const supabase = {
      storage: { from },
    } as unknown as SupabaseClient;

    const file = new File([new Uint8Array([1, 2])], "ref.jpg", { type: "image/jpeg" });
    const url = await uploadGenerationReference(supabase, "user-1", file);

    expect(url).toBe("https://example.com/storage/obj.jpg");
    expect(from).toHaveBeenCalledWith(GENERATION_REFERENCES_BUCKET);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/[0-9a-f-]{36}\.jpg$/),
      file,
      expect.objectContaining({
        cacheControl: "3600",
        upsert: false,
        contentType: "image/jpeg",
      })
    );
  });

  it("propagates storage errors", async () => {
    const upload = vi.fn().mockResolvedValue({ error: { message: "quota" } });
    const from = vi.fn(() => ({ upload, getPublicUrl: vi.fn() }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;
    const file = new File([""], "a.jpg", { type: "image/jpeg" });
    await expect(uploadGenerationReference(supabase, "u", file)).rejects.toThrow("quota");
  });
});

describe("uploadGeneratedPosterFromUrl", () => {
  it("rejects non-http URLs", async () => {
    const supabase = {} as SupabaseClient;
    await expect(uploadGeneratedPosterFromUrl(supabase, "u", "data:image/png;base64,xx")).rejects.toThrow(
      /Invalid image URL/
    );
  });

  it("downloads and uploads webp, returns public URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () => Promise.resolve(new Blob([new Uint8Array([1, 2])], { type: "image/webp" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn(() => ({
      data: { publicUrl: "https://proj.supabase.co/storage/v1/object/public/gen/out.webp" },
    }));
    const from = vi.fn(() => ({ upload, getPublicUrl }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;

    const url = await uploadGeneratedPosterFromUrl(supabase, "user-1", "https://replicate.delivery/x.webp");

    expect(url).toContain("supabase.co");
    expect(from).toHaveBeenCalledWith(GENERATED_POSTERS_BUCKET);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(/^user-1\/[0-9a-f-]{36}\.webp$/),
      expect.any(Blob),
      expect.objectContaining({ contentType: "image/webp" })
    );

    vi.unstubAllGlobals();
  });

  it("treats octet-stream as webp", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      blob: () =>
        Promise.resolve(new Blob([new Uint8Array([3])], { type: "application/octet-stream" })),
    });
    vi.stubGlobal("fetch", fetchMock);

    const upload = vi.fn().mockResolvedValue({ error: null });
    const getPublicUrl = vi.fn(() => ({ data: { publicUrl: "https://ex/u" } }));
    const from = vi.fn(() => ({ upload, getPublicUrl }));
    const supabase = { storage: { from } } as unknown as SupabaseClient;

    await uploadGeneratedPosterFromUrl(supabase, "u", "https://example.com/a");

    expect(upload.mock.calls[0]?.[2]).toMatchObject({ contentType: "image/webp" });
    vi.unstubAllGlobals();
  });

  it("throws when download fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 403 }));
    const supabase = { storage: { from: vi.fn() } } as unknown as SupabaseClient;
    await expect(
      uploadGeneratedPosterFromUrl(supabase, "u", "https://example.com/i")
    ).rejects.toThrow(/403/);
    vi.unstubAllGlobals();
  });
});
