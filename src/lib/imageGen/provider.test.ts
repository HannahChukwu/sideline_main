import { describe, expect, it } from "vitest";
import { generateImage } from "./provider";

describe("generateImage", () => {
  it("returns a stable URL for the same prompt", async () => {
    const a = await generateImage({ prompt: "hello" });
    const b = await generateImage({ prompt: "hello" });
    expect(a.imageUrl).toBe(b.imageUrl);
  });

  it("may return different URLs for different prompts", async () => {
    const urls = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const r = await generateImage({ prompt: `p-${i}` });
      urls.add(r.imageUrl);
    }
    expect(urls.size).toBeGreaterThan(1);
  });
});
