import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const lsStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (k: string) => lsStore[k] ?? null,
  setItem: (k: string, v: string) => {
    lsStore[k] = v;
  },
  removeItem: (k: string) => {
    delete lsStore[k];
  },
  clear: () => {
    for (const k of Object.keys(lsStore)) delete lsStore[k];
  },
};

describe("useAppStore", () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.stubGlobal("localStorage", localStorageMock);
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("setCurrentDesigner trims", async () => {
    const { useAppStore } = await import("./store");
    useAppStore.getState().setCurrentDesigner("  Alex  ");
    expect(useAppStore.getState().currentDesigner).toBe("Alex");
  });

  it("addAsset prepends and returns id", async () => {
    const { useAppStore } = await import("./store");
    const n = useAppStore.getState().assets.length;
    const id = useAppStore.getState().addAsset({
      title: "T",
      tagline: "",
      type: "gameday",
      status: "draft",
      sport: "Soccer",
      homeTeam: "H",
      awayTeam: "A",
      eventDate: "2026-01-01",
      imageUrl: "",
      style: "illustrated",
      format: "story",
      designerName: "D",
    });
    expect(useAppStore.getState().assets.length).toBe(n + 1);
    expect(useAppStore.getState().assets[0]?.id).toBe(id);
  });

  it("toggleLike and isLiked", async () => {
    const { useAppStore } = await import("./store");
    const id = useAppStore.getState().assets[0]?.id;
    expect(id).toBeDefined();
    const before = useAppStore.getState().assets.find((a) => a.id === id)!.likes;
    expect(useAppStore.getState().isLiked(id!)).toBe(false);
    useAppStore.getState().toggleLike(id!);
    expect(useAppStore.getState().isLiked(id!)).toBe(true);
    expect(useAppStore.getState().assets.find((a) => a.id === id)!.likes).toBe(before + 1);
    useAppStore.getState().toggleLike(id!);
    expect(useAppStore.getState().isLiked(id!)).toBe(false);
  });

  it("deleteAsset removes asset and folder refs", async () => {
    const { useAppStore } = await import("./store");
    const id = useAppStore.getState().addAsset({
      title: "Tmp",
      tagline: "",
      type: "poster",
      status: "draft",
      sport: "Soccer",
      homeTeam: "H",
      awayTeam: "A",
      eventDate: "2026-01-01",
      imageUrl: "",
      style: "illustrated",
      format: "story",
      designerName: "D",
    });
    const folderId = useAppStore.getState().folders[0]!.id;
    useAppStore.getState().addAssetToFolder(id, folderId);
    useAppStore.getState().deleteAsset(id);
    expect(useAppStore.getState().assets.some((a) => a.id === id)).toBe(false);
    expect(
      useAppStore.getState().folders.find((f) => f.id === folderId)?.assetIds
    ).not.toContain(id);
  });

  it("folder CRUD and moveAssetToFolder", async () => {
    const { useAppStore } = await import("./store");
    const fid = useAppStore.getState().addFolder("  Temp  ", "blue");
    useAppStore.getState().renameFolder(fid, " Renamed ");
    const folder = useAppStore.getState().folders.find((f) => f.id === fid);
    expect(folder?.name).toBe("Renamed");

    const aid = useAppStore.getState().assets[0]!.id;
    useAppStore.getState().addAssetToFolder(aid, fid);
    expect(useAppStore.getState().folders.find((f) => f.id === fid)?.assetIds).toContain(
      aid
    );
    useAppStore.getState().removeAssetFromFolder(aid, fid);
    expect(useAppStore.getState().folders.find((f) => f.id === fid)?.assetIds).not.toContain(
      aid
    );

    const f2 = useAppStore.getState().addFolder("Other", "green");
    useAppStore.getState().addAssetToFolder(aid, f2);
    useAppStore.getState().moveAssetToFolder(aid, f2, fid);
    expect(useAppStore.getState().folders.find((f) => f.id === f2)?.assetIds).not.toContain(
      aid
    );
    expect(useAppStore.getState().folders.find((f) => f.id === fid)?.assetIds).toContain(aid);

    useAppStore.getState().deleteFolder(fid);
    expect(useAppStore.getState().folders.some((f) => f.id === fid)).toBe(false);
  });

  it("setAthleteProfile merges and sets updatedAt", async () => {
    const { useAppStore } = await import("./store");
    useAppStore.getState().setAthleteProfile({ name: "Jordan", bio: "Hello" });
    const p = useAppStore.getState().athleteProfile;
    expect(p.name).toBe("Jordan");
    expect(p.bio).toBe("Hello");
    expect(p.updatedAt.length).toBeGreaterThan(0);
  });

  it("addUpdate prepends designer note", async () => {
    const { useAppStore } = await import("./store");
    const aid = useAppStore.getState().assets[0]!.id;
    useAppStore.getState().addUpdate(aid, " Ship it ", "Pat");
    const u = useAppStore.getState().assets.find((a) => a.id === aid)?.updates[0];
    expect(u?.text).toBe("Ship it");
    expect(u?.designerName).toBe("Pat");
  });

  it("updateStatus", async () => {
    const { useAppStore } = await import("./store");
    const aid = useAppStore.getState().assets[0]!.id;
    useAppStore.getState().updateStatus(aid, "archived");
    expect(useAppStore.getState().assets.find((a) => a.id === aid)?.status).toBe(
      "archived"
    );
  });
});
