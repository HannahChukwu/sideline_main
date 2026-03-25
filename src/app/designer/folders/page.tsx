"use client";

import { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Plus, FolderOpen, X, Pencil, Check, ChevronLeft, ChevronRight, Trash2, FolderPlus } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { useAppStore } from "@/lib/store";
import type { DesignerFolder, StoreAsset } from "@/lib/store";
import { cn } from "@/lib/utils";

/* ── Folder colour map ────────────────────────────────────────────────────── */
const FOLDER_COLORS: Record<string, { bg: string; border: string; tab: string; text: string }> = {
  orange: { bg: "bg-orange-500/10",  border: "border-orange-500/25", tab: "bg-orange-500/20",  text: "text-orange-400" },
  blue:   { bg: "bg-blue-500/10",    border: "border-blue-500/25",   tab: "bg-blue-500/20",    text: "text-blue-400"   },
  purple: { bg: "bg-purple-500/10",  border: "border-purple-500/25", tab: "bg-purple-500/20",  text: "text-purple-400" },
  rose:   { bg: "bg-rose-500/10",    border: "border-rose-500/25",   tab: "bg-rose-500/20",    text: "text-rose-400"   },
  green:  { bg: "bg-green-500/10",   border: "border-green-500/25",  tab: "bg-green-500/20",   text: "text-green-400"  },
  yellow: { bg: "bg-yellow-500/10",  border: "border-yellow-500/25", tab: "bg-yellow-500/20",  text: "text-yellow-400" },
};

const COLOR_OPTIONS = ["orange", "blue", "purple", "rose", "green", "yellow"] as const;
const COLOR_DOT: Record<string, string> = {
  orange: "bg-orange-400", blue: "bg-blue-400", purple: "bg-purple-400",
  rose: "bg-rose-400", green: "bg-green-400", yellow: "bg-yellow-400",
};

/* ── Folder icon (macOS-ish SVG) ─────────────────────────────────────────── */
function FolderIcon({ color, size = 64 }: { color: string; size?: number }) {
  const accent = {
    orange: "#f97316", blue: "#3b82f6", purple: "#a855f7",
    rose: "#f43f5e", green: "#22c55e", yellow: "#eab308",
  }[color] ?? "#6366f1";

  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Tab */}
      <path d="M4 20 Q4 16 8 16 L28 16 Q30 16 31 18 L33 22 L60 22 Q60 22 60 26 L60 52 Q60 56 56 56 L8 56 Q4 56 4 52 Z"
        fill={accent} fillOpacity="0.18" stroke={accent} strokeOpacity="0.5" strokeWidth="1.5" strokeLinejoin="round" />
      {/* Body */}
      <path d="M4 24 L4 52 Q4 56 8 56 L56 56 Q60 56 60 52 L60 26 L4 24 Z"
        fill={accent} fillOpacity="0.28" />
      {/* Shine */}
      <path d="M8 26 L56 26 L56 32 Q32 34 8 32 Z" fill="white" fillOpacity="0.06" />
    </svg>
  );
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function FoldersPage() {
  const [mounted, setMounted] = useState(false);
  const [openFolder, setOpenFolder] = useState<DesignerFolder | null>(null);
  const [folderPage, setFolderPage] = useState(0); // pagination inside open folder
  const [draggingAssetId, setDraggingAssetId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderColor, setNewFolderColor] = useState<string>("blue");
  const [showUnfiled, setShowUnfiled] = useState(false);
  const [unfiledPage, setUnfiledPage] = useState(0);
  const renameRef = useRef<HTMLInputElement>(null);

  const assets            = useAppStore((s) => s.assets);
  const folders           = useAppStore((s) => s.folders);
  const currentDesigner   = useAppStore((s) => s.currentDesigner);
  const addFolder         = useAppStore((s) => s.addFolder);
  const renameFolder      = useAppStore((s) => s.renameFolder);
  const deleteFolder      = useAppStore((s) => s.deleteFolder);
  const addAssetToFolder  = useAppStore((s) => s.addAssetToFolder);
  const removeAssetFromFolder = useAppStore((s) => s.removeAssetFromFolder);

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (editingFolderId) renameRef.current?.focus();
  }, [editingFolderId]);

  const myAssets = mounted
    ? assets.filter((a) => !currentDesigner || a.designerName === currentDesigner)
    : [];

  // Assets NOT yet in any folder
  const filedIds = new Set(folders.flatMap((f) => f.assetIds));
  const unfiled  = myAssets.filter((a) => !filedIds.has(a.id));

  const CARDS_PER_PAGE = 6;

  function getFolderAssets(folder: DesignerFolder): StoreAsset[] {
    return folder.assetIds
      .map((id) => assets.find((a) => a.id === id))
      .filter(Boolean) as StoreAsset[];
  }

  /* ── Drag handlers ── */
  function onDragStart(assetId: string) {
    setDraggingAssetId(assetId);
  }
  function onDragOver(e: React.DragEvent, folderId: string) {
    e.preventDefault();
    setDragOverFolderId(folderId);
  }
  function onDrop(e: React.DragEvent, targetFolderId: string) {
    e.preventDefault();
    if (!draggingAssetId) return;
    addAssetToFolder(draggingAssetId, targetFolderId);
    setDraggingAssetId(null);
    setDragOverFolderId(null);
  }
  function onDragEnd() {
    setDraggingAssetId(null);
    setDragOverFolderId(null);
  }

  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/40 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  const openFolderAssets   = openFolder ? getFolderAssets(openFolder) : [];
  const openFolderPages    = Math.ceil(openFolderAssets.length / CARDS_PER_PAGE);
  const openFolderSlice    = openFolderAssets.slice(folderPage * CARDS_PER_PAGE, (folderPage + 1) * CARDS_PER_PAGE);
  const unfiledPages       = Math.ceil(unfiled.length / CARDS_PER_PAGE);
  const unfiledSlice       = unfiled.slice(unfiledPage * CARDS_PER_PAGE, (unfiledPage + 1) * CARDS_PER_PAGE);

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="designer" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">

        {/* Header */}
        <div className="pt-8 mb-10 flex items-end justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Link href="/designer" className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
              </Link>
            </div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Designer Portal</p>
            <h1 className="text-3xl font-bold">Poster Folders</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organize your posters into folders — drag &amp; drop assets to categorize them.
            </p>
          </div>
          <button
            onClick={() => setShowNewFolder(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all"
          >
            <FolderPlus className="w-4 h-4" />
            New Folder
          </button>
        </div>

        {/* New folder form */}
        {showNewFolder && (
          <div className="mb-8 rounded-2xl border border-primary/20 bg-primary/5 p-5">
            <h2 className="text-sm font-bold mb-4 text-foreground">Create New Folder</h2>
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
              <input
                autoFocus
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newFolderName.trim()) {
                    addFolder(newFolderName, newFolderColor);
                    setNewFolderName("");
                    setShowNewFolder(false);
                  }
                  if (e.key === "Escape") setShowNewFolder(false);
                }}
                placeholder="Folder name…"
                className="flex-1 px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:border-primary/40 transition-all"
              />
              {/* Color picker */}
              <div className="flex items-center gap-2">
                {COLOR_OPTIONS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewFolderColor(c)}
                    className={cn(
                      "w-6 h-6 rounded-full transition-all",
                      COLOR_DOT[c],
                      newFolderColor === c && "ring-2 ring-white/60 ring-offset-1 ring-offset-background scale-110"
                    )}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (newFolderName.trim()) {
                      addFolder(newFolderName, newFolderColor);
                      setNewFolderName("");
                      setShowNewFolder(false);
                    }
                  }}
                  disabled={!newFolderName.trim()}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-40 hover:bg-primary/90 transition-all"
                >
                  Create
                </button>
                <button
                  onClick={() => setShowNewFolder(false)}
                  className="px-4 py-2.5 rounded-xl bg-muted text-muted-foreground text-sm hover:text-foreground transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Folders grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-5 mb-12">
          {folders.map((folder) => {
            const folderClr = FOLDER_COLORS[folder.color] ?? FOLDER_COLORS.blue;
            const count     = folder.assetIds.length;
            const isOver    = dragOverFolderId === folder.id;
            const isOpen    = openFolder?.id === folder.id;

            return (
              <div
                key={folder.id}
                onDragOver={(e) => onDragOver(e, folder.id)}
                onDrop={(e) => onDrop(e, folder.id)}
                onDragLeave={() => setDragOverFolderId(null)}
                className={cn(
                  "group relative flex flex-col items-center gap-2 p-4 rounded-2xl border transition-all duration-200 cursor-pointer select-none",
                  folderClr.bg, folderClr.border,
                  isOver && "scale-105 shadow-lg shadow-black/30 border-opacity-80",
                  isOpen && "ring-2 ring-primary/40"
                )}
                onClick={() => {
                  if (editingFolderId === folder.id) return;
                  setOpenFolder(isOpen ? null : folder);
                  setFolderPage(0);
                }}
              >
                {/* Folder icon */}
                <div className={cn("transition-transform duration-200", isOver && "scale-110")}>
                  <FolderIcon color={folder.color} size={56} />
                </div>

                {/* Asset count badge */}
                {count > 0 && (
                  <div className={cn(
                    "absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full text-[10px] font-bold flex items-center justify-center border border-background",
                    folderClr.tab, folderClr.text
                  )}>
                    {count}
                  </div>
                )}

                {/* Drop indicator */}
                {isOver && (
                  <div className="absolute inset-0 rounded-2xl bg-white/5 pointer-events-none flex items-center justify-center">
                    <Plus className="w-6 h-6 text-white/30" />
                  </div>
                )}

                {/* Folder name — editable on dbl-click */}
                {editingFolderId === folder.id ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (editingName.trim()) renameFolder(folder.id, editingName);
                      setEditingFolderId(null);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full"
                  >
                    <input
                      ref={renameRef}
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={() => {
                        if (editingName.trim()) renameFolder(folder.id, editingName);
                        setEditingFolderId(null);
                      }}
                      onKeyDown={(e) => { if (e.key === "Escape") setEditingFolderId(null); }}
                      className="w-full px-2 py-1 rounded-lg bg-background/60 border border-primary/30 text-xs text-center text-foreground focus:outline-none"
                    />
                  </form>
                ) : (
                  <span
                    className={cn("text-xs font-semibold text-center leading-tight line-clamp-2 max-w-full", folderClr.text)}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      setEditingFolderId(folder.id);
                      setEditingName(folder.name);
                    }}
                  >
                    {folder.name}
                  </span>
                )}

                {/* Controls (hover) */}
                <div
                  className="absolute top-1 left-1 hidden group-hover:flex items-center gap-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={() => { setEditingFolderId(folder.id); setEditingName(folder.name); }}
                    className="w-5 h-5 rounded-md bg-black/40 flex items-center justify-center hover:bg-black/60 transition-colors"
                    title="Rename"
                  >
                    <Pencil className="w-2.5 h-2.5 text-white/70" />
                  </button>
                  <button
                    onClick={() => { deleteFolder(folder.id); if (openFolder?.id === folder.id) setOpenFolder(null); }}
                    className="w-5 h-5 rounded-md bg-black/40 flex items-center justify-center hover:bg-red-500/60 transition-colors"
                    title="Delete folder"
                  >
                    <Trash2 className="w-2.5 h-2.5 text-white/70" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Open folder panel ─────────────────────────────────────────────── */}
        {openFolder && (
          <div className="mb-12 animate-fade-up">
            {(() => {
              const folderClr = FOLDER_COLORS[openFolder.color] ?? FOLDER_COLORS.blue;
              return (
                <div className={cn("rounded-2xl border p-6", folderClr.bg, folderClr.border)}>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <FolderOpen className={cn("w-5 h-5", folderClr.text)} />
                      <h2 className={cn("text-lg font-bold", folderClr.text)}>{openFolder.name}</h2>
                      <span className="text-xs text-muted-foreground">{openFolderAssets.length} poster{openFolderAssets.length !== 1 ? "s" : ""}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Pagination */}
                      {openFolderPages > 1 && (
                        <div className="flex items-center gap-1.5 mr-2">
                          <button
                            onClick={() => setFolderPage((p) => Math.max(0, p - 1))}
                            disabled={folderPage === 0}
                            className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center disabled:opacity-30 hover:bg-black/40 transition-colors"
                          >
                            <ChevronLeft className="w-3.5 h-3.5 text-white" />
                          </button>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {folderPage + 1} / {openFolderPages}
                          </span>
                          <button
                            onClick={() => setFolderPage((p) => Math.min(openFolderPages - 1, p + 1))}
                            disabled={folderPage === openFolderPages - 1}
                            className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center disabled:opacity-30 hover:bg-black/40 transition-colors"
                          >
                            <ChevronRight className="w-3.5 h-3.5 text-white" />
                          </button>
                        </div>
                      )}
                      <button onClick={() => setOpenFolder(null)} className="w-7 h-7 rounded-lg bg-black/20 flex items-center justify-center hover:bg-black/40 transition-colors">
                        <X className="w-3.5 h-3.5 text-white" />
                      </button>
                    </div>
                  </div>

                  {openFolderSlice.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground/40 text-sm">
                      Empty folder — drag posters from below to add them here.
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                      {openFolderSlice.map((asset) => (
                        <div key={asset.id} className="group relative">
                          <Link href={`/asset/${asset.id}`}>
                            <div className="relative rounded-xl overflow-hidden aspect-[4/5] bg-muted border border-white/10 hover:border-white/20 transition-all">
                              <Image
                                src={asset.imageUrl}
                                alt={asset.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                sizes="200px"
                                unoptimized
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                              <div className="absolute bottom-0 left-0 right-0 p-2">
                                <p className="text-[10px] font-semibold text-white/90 line-clamp-2 leading-tight">{asset.title}</p>
                              </div>
                            </div>
                          </Link>
                          {/* Remove from folder button */}
                          <button
                            onClick={() => {
                              removeAssetFromFolder(asset.id, openFolder.id);
                              // refresh open folder reference
                              const updated = folders.find((f) => f.id === openFolder.id);
                              if (updated) setOpenFolder({ ...updated, assetIds: updated.assetIds.filter((id) => id !== asset.id) });
                            }}
                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-black/70 border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80"
                            title="Remove from folder"
                          >
                            <X className="w-2.5 h-2.5 text-white" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {/* ── Unfiled posters (drag source) ─────────────────────────────────── */}
        <div className="rounded-2xl border border-border/40 bg-card/50 overflow-hidden">
          <button
            onClick={() => setShowUnfiled((v) => !v)}
            className="w-full flex items-center justify-between px-6 py-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold text-foreground">Unfiled Posters</span>
              <span className="px-2 py-0.5 rounded-full bg-muted border border-border/50 text-xs font-semibold text-muted-foreground">
                {unfiled.length}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Drag into a folder above</span>
              {showUnfiled ? <ChevronLeft className="w-4 h-4 rotate-90" /> : <ChevronLeft className="w-4 h-4 -rotate-90" />}
            </div>
          </button>

          {showUnfiled && (
            <div className="px-6 pb-6 border-t border-border/30">
              {unfiled.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground/40">
                  All your posters are organized in folders.{" "}
                  <Link href="/designer/create" className="text-primary hover:underline">Create a new one →</Link>
                </p>
              ) : (
                <>
                  {/* Pagination */}
                  {unfiledPages > 1 && (
                    <div className="flex items-center justify-end gap-2 pt-4 pb-2">
                      <button onClick={() => setUnfiledPage((p) => Math.max(0, p - 1))} disabled={unfiledPage === 0}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums">{unfiledPage + 1} / {unfiledPages}</span>
                      <button onClick={() => setUnfiledPage((p) => Math.min(unfiledPages - 1, p + 1))} disabled={unfiledPage === unfiledPages - 1}
                        className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center disabled:opacity-30 hover:bg-muted/70 transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 pt-4">
                    {unfiledSlice.map((asset) => (
                      <div
                        key={asset.id}
                        draggable
                        onDragStart={() => onDragStart(asset.id)}
                        onDragEnd={onDragEnd}
                        className={cn(
                          "group relative cursor-grab active:cursor-grabbing transition-all duration-150",
                          draggingAssetId === asset.id && "opacity-40 scale-95"
                        )}
                      >
                        <Link href={`/asset/${asset.id}`} onClick={(e) => draggingAssetId && e.preventDefault()}>
                          <div className="relative rounded-xl overflow-hidden aspect-[4/5] bg-muted border border-border/50 hover:border-border transition-all group-hover:shadow-lg">
                            <Image
                              src={asset.imageUrl}
                              alt={asset.title}
                              fill
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                              sizes="200px"
                              unoptimized
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                            {/* Drag handle hint */}
                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <div className="w-5 h-5 rounded bg-black/50 flex items-center justify-center">
                                <svg viewBox="0 0 10 10" className="w-3 h-3 text-white/70" fill="currentColor">
                                  <circle cx="3" cy="3" r="1.2"/><circle cx="7" cy="3" r="1.2"/>
                                  <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
                                </svg>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 p-2">
                              <p className="text-[10px] font-semibold text-white/90 line-clamp-2 leading-tight">{asset.title}</p>
                              <p className="text-[9px] text-white/40 mt-0.5">{asset.sport}</p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

      </main>
    </div>
  );
}
