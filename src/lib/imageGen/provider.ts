export type ImageGenRequest = {
  prompt: string;
};

export type ImageGenResult = {
  imageUrl: string;
};

const STUB_IMAGES = [
  "https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&q=80",
  "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&q=80",
  "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80",
  "https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=800&q=80",
];

export async function generateImage(req: ImageGenRequest): Promise<ImageGenResult> {
  // Stub provider: deterministic-ish selection based on prompt hash.
  let h = 0;
  for (let i = 0; i < req.prompt.length; i++) h = (h * 31 + req.prompt.charCodeAt(i)) >>> 0;
  const idx = STUB_IMAGES.length ? h % STUB_IMAGES.length : 0;
  return { imageUrl: STUB_IMAGES[idx] ?? STUB_IMAGES[0]! };
}

