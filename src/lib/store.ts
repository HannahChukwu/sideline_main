import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { MOCK_ASSETS } from "./mock-data";

export type AssetType = "gameday" | "final-score" | "poster" | "highlight";
export type AssetStatus = "draft" | "published" | "archived";

export interface DesignerUpdate {
  id: string;
  text: string;
  timestamp: string;
  designerName: string;
}

export interface StoreAsset {
  id: string;
  title: string;
  tagline: string;
  type: AssetType;
  status: AssetStatus;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeScore?: number;
  awayScore?: number;
  eventDate: string;
  imageUrl: string;
  style: string;
  format: string;
  likes: number;
  likedBy: string[];
  designerName: string;
  createdAt: string;
  updates: DesignerUpdate[];
}

// ── Athlete profile ──────────────────────────────────────────────────────────

/** One row in the athlete's personal stat table */
export interface StatRow {
  label: string; // e.g. "Points per Game"
  value: string; // e.g. "18.4"
}

/** Sport-specific stat presets so athletes get sensible defaults */
export const STAT_PRESETS: Record<string, StatRow[]> = {
  Basketball: [
    { label: "Points per Game", value: "" },
    { label: "Rebounds per Game", value: "" },
    { label: "Assists per Game", value: "" },
    { label: "Steals per Game", value: "" },
    { label: "Blocks per Game", value: "" },
    { label: "Field Goal %", value: "" },
    { label: "3-Point %", value: "" },
    { label: "Free Throw %", value: "" },
  ],
  Football: [
    { label: "Passing Yards", value: "" },
    { label: "Touchdowns", value: "" },
    { label: "Interceptions", value: "" },
    { label: "Rushing Yards", value: "" },
    { label: "Receiving Yards", value: "" },
    { label: "Tackles", value: "" },
    { label: "Sacks", value: "" },
  ],
  Soccer: [
    { label: "Goals", value: "" },
    { label: "Assists", value: "" },
    { label: "Shots on Target", value: "" },
    { label: "Minutes Played", value: "" },
    { label: "Yellow Cards", value: "" },
    { label: "Save %", value: "" },
  ],
  Baseball: [
    { label: "Batting Average", value: "" },
    { label: "Home Runs", value: "" },
    { label: "RBI", value: "" },
    { label: "ERA", value: "" },
    { label: "Strikeouts", value: "" },
    { label: "Walks", value: "" },
    { label: "Stolen Bases", value: "" },
  ],
  Softball: [
    { label: "Batting Average", value: "" },
    { label: "Home Runs", value: "" },
    { label: "RBI", value: "" },
    { label: "ERA", value: "" },
    { label: "Strikeouts", value: "" },
    { label: "Slugging %", value: "" },
  ],
  Volleyball: [
    { label: "Kills per Set", value: "" },
    { label: "Assists per Set", value: "" },
    { label: "Digs per Set", value: "" },
    { label: "Blocks per Set", value: "" },
    { label: "Service Aces", value: "" },
    { label: "Attack %", value: "" },
  ],
  "Track & Field": [
    { label: "Event", value: "" },
    { label: "Personal Best", value: "" },
    { label: "Season Best", value: "" },
    { label: "Rank (Conference)", value: "" },
    { label: "Rank (National)", value: "" },
  ],
  Swimming: [
    { label: "Primary Stroke / Event", value: "" },
    { label: "Personal Best", value: "" },
    { label: "Season Best", value: "" },
    { label: "Rank (Conference)", value: "" },
    { label: "Rank (National)", value: "" },
  ],
  Wrestling: [
    { label: "Weight Class", value: "" },
    { label: "Wins", value: "" },
    { label: "Losses", value: "" },
    { label: "Falls (Pins)", value: "" },
    { label: "Tech Falls", value: "" },
    { label: "Major Decisions", value: "" },
  ],
};

export interface AthleteProfile {
  name: string;
  sport: string;
  team: string;
  number: string; // jersey number
  position: string;
  year: string;  // e.g. "Sophomore", "Senior"
  bio: string;
  stats: StatRow[];
  /** ISO timestamp of last update */
  updatedAt: string;
}

export const EMPTY_ATHLETE_PROFILE: AthleteProfile = {
  name: "", sport: "Basketball", team: "", number: "", position: "",
  year: "", bio: "", stats: [], updatedAt: "",
};

export interface DesignerFolder {
  id: string;
  name: string;
  color: string; // tailwind color key e.g. "blue", "orange", "purple", "green", "rose", "yellow"
  assetIds: string[];
  createdAt: string;
}

const MOCK_SIGNATURES = new Set(
  MOCK_ASSETS.map((a) => `${a.id}::${a.title}::${a.imageUrl}`)
);

function isSeededMockAsset(asset: Pick<StoreAsset, "id" | "title" | "imageUrl">): boolean {
  return MOCK_SIGNATURES.has(`${asset.id}::${asset.title}::${asset.imageUrl}`);
}

const SEED_FOLDERS: DesignerFolder[] = [
  { id: "folder-gameday",  name: "Game Day",       color: "orange", assetIds: [], createdAt: new Date().toISOString() },
  { id: "folder-finals",   name: "Finals",          color: "blue",   assetIds: [], createdAt: new Date().toISOString() },
  { id: "folder-season",   name: "Season 2025–26",  color: "purple", assetIds: [], createdAt: new Date().toISOString() },
  { id: "folder-champs",   name: "Championships",   color: "rose",   assetIds: [], createdAt: new Date().toISOString() },
  { id: "folder-hype",     name: "Hype / Promos",   color: "green",  assetIds: [], createdAt: new Date().toISOString() },
  { id: "folder-archive",  name: "Archive",         color: "yellow", assetIds: [], createdAt: new Date().toISOString() },
];

function uid() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

interface AppState {
  assets: StoreAsset[];
  folders: DesignerFolder[];
  sessionId: string;
  currentDesigner: string;
  /** Each athlete's profile is stored by a self-chosen handle (name) */
  athleteProfile: AthleteProfile;

  setCurrentDesigner: (name: string) => void;
  setAthleteProfile: (profile: Partial<AthleteProfile>) => void;
  addAsset: (data: Omit<StoreAsset, "id" | "likes" | "likedBy" | "createdAt" | "updates">) => string;
  updateStatus: (id: string, status: AssetStatus) => void;
  toggleLike: (id: string) => void;
  isLiked: (id: string) => boolean;
  addUpdate: (assetId: string, text: string, designerName: string) => void;

  /** Permanently remove an asset and strip it from all folders. */
  deleteAsset: (id: string) => void;

  // Folder actions
  addFolder: (name: string, color: string) => string;
  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;
  addAssetToFolder: (assetId: string, folderId: string) => void;
  removeAssetFromFolder: (assetId: string, folderId: string) => void;
  moveAssetToFolder: (assetId: string, fromFolderId: string | null, toFolderId: string) => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Start empty: all feed assets should come from real data, not seeded mocks.
      assets: [],
      folders: SEED_FOLDERS,
      sessionId: uid(),
      currentDesigner: "",
      athleteProfile: { ...EMPTY_ATHLETE_PROFILE },

      setCurrentDesigner(name) {
        set({ currentDesigner: name.trim() });
      },

      setAthleteProfile(profile) {
        set((s) => ({
          athleteProfile: {
            ...s.athleteProfile,
            ...profile,
            updatedAt: new Date().toISOString(),
          },
        }));
      },

      addAsset(data) {
        const id = uid();
        set((s) => ({
          assets: [
            { ...data, id, likes: 0, likedBy: [], createdAt: new Date().toISOString(), updates: [] },
            ...s.assets,
          ],
        }));
        return id;
      },

      updateStatus(id, status) {
        set((s) => ({
          assets: s.assets.map((a) => (a.id === id ? { ...a, status } : a)),
        }));
      },

      toggleLike(id) {
        const sid = get().sessionId;
        set((s) => ({
          assets: s.assets.map((a) => {
            if (a.id !== id) return a;
            const has = a.likedBy.includes(sid);
            return {
              ...a,
              likes: has ? a.likes - 1 : a.likes + 1,
              likedBy: has ? a.likedBy.filter((x) => x !== sid) : [...a.likedBy, sid],
            };
          }),
        }));
      },

      isLiked(id) {
        const { assets, sessionId } = get();
        return assets.find((a) => a.id === id)?.likedBy.includes(sessionId) ?? false;
      },

      deleteAsset(id) {
        set((s) => ({
          assets: s.assets.filter((a) => a.id !== id),
          folders: s.folders.map((f) => ({ ...f, assetIds: f.assetIds.filter((aid) => aid !== id) })),
        }));
      },

      addUpdate(assetId, text, designerName) {
        const update: DesignerUpdate = {
          id: uid(),
          text: text.trim(),
          timestamp: new Date().toISOString(),
          designerName,
        };
        set((s) => ({
          assets: s.assets.map((a) =>
            a.id === assetId ? { ...a, updates: [update, ...(a.updates ?? [])] } : a
          ),
        }));
      },

      // ── Folders ───────────────────────────────────────────────────────────
      addFolder(name, color) {
        const id = uid();
        set((s) => ({
          folders: [
            ...s.folders,
            { id, name: name.trim(), color, assetIds: [], createdAt: new Date().toISOString() },
          ],
        }));
        return id;
      },

      renameFolder(id, name) {
        set((s) => ({
          folders: s.folders.map((f) => (f.id === id ? { ...f, name: name.trim() } : f)),
        }));
      },

      deleteFolder(id) {
        set((s) => ({ folders: s.folders.filter((f) => f.id !== id) }));
      },

      addAssetToFolder(assetId, folderId) {
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === folderId && !f.assetIds.includes(assetId)
              ? { ...f, assetIds: [...f.assetIds, assetId] }
              : f
          ),
        }));
      },

      removeAssetFromFolder(assetId, folderId) {
        set((s) => ({
          folders: s.folders.map((f) =>
            f.id === folderId
              ? { ...f, assetIds: f.assetIds.filter((id) => id !== assetId) }
              : f
          ),
        }));
      },

      moveAssetToFolder(assetId, fromFolderId, toFolderId) {
        set((s) => ({
          folders: s.folders.map((f) => {
            if (f.id === fromFolderId) {
              return { ...f, assetIds: f.assetIds.filter((id) => id !== assetId) };
            }
            if (f.id === toFolderId && !f.assetIds.includes(assetId)) {
              return { ...f, assetIds: [...f.assetIds, assetId] };
            }
            return f;
          }),
        }));
      },
    }),
    {
      name: "sideline-v2",
      version: 2,
      storage: createJSONStorage(() => ({
        getItem: (name: string) =>
          typeof window !== "undefined" ? localStorage.getItem(name) : null,
        setItem: (name: string, value: string) => {
          if (typeof window !== "undefined") localStorage.setItem(name, value);
        },
        removeItem: (name: string) => {
          if (typeof window !== "undefined") localStorage.removeItem(name);
        },
      })),
      migrate: (persistedState, version) => {
        if (!persistedState || typeof persistedState !== "object") return persistedState;
        if (version >= 2) return persistedState;
        const state = persistedState as Partial<AppState>;
        const existingAssets = Array.isArray(state.assets) ? state.assets : [];
        return {
          ...state,
          assets: existingAssets.filter((asset) => !isSeededMockAsset(asset)),
        };
      },
      partialize: (s) => ({
        assets: s.assets,
        folders: s.folders,
        sessionId: s.sessionId,
        currentDesigner: s.currentDesigner,
        athleteProfile: s.athleteProfile,
      }),
    }
  )
);
