"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ImagePlus, Loader2, Trash2, User } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { createClient } from "@/lib/supabase/client";
import { getAthletesForTeam, findAthleteByTeamAndName } from "@/lib/supabase/athletes";
import { fetchProfileAthleteId, fetchProfileTeamId, updateProfileAthleteId } from "@/lib/supabase/profile";
import {
  deleteAthletePhoto,
  listMyAthletePhotos,
  uploadAthletePhoto,
  type AthletePhoto,
} from "@/lib/supabase/athletePhotos";
import type { Athlete } from "@/lib/pipeline/types";

export default function AthletePicturesPage() {
  const supabase = useMemo(() => createClient(), []);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [athleteId, setAthleteId] = useState<string | null>(null);
  const [roster, setRoster] = useState<Athlete[]>([]);
  const [photos, setPhotos] = useState<AthletePhoto[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await supabase.auth.getSession();
        const uid = data.session?.user?.id ?? null;
        if (!uid || cancelled) {
          setUserId(null);
          return;
        }
        setUserId(uid);

        const [profileTeamId, profileAthleteId] = await Promise.all([
          fetchProfileTeamId(supabase, uid),
          fetchProfileAthleteId(supabase, uid),
        ]);
        if (cancelled) return;
        setTeamId(profileTeamId);
        setAthleteId(profileAthleteId);

        if (profileTeamId) {
          const teamRoster = await getAthletesForTeam(supabase, profileTeamId);
          if (cancelled) return;
          setRoster(teamRoster);

          // Attempt one-time auto-link by exact full_name match if athlete_id is unset.
          if (!profileAthleteId) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name")
              .eq("id", uid)
              .maybeSingle();
            const maybeName = profile?.full_name?.trim() ?? "";
            if (maybeName) {
              const match = await findAthleteByTeamAndName(supabase, profileTeamId, maybeName);
              if (match) {
                await updateProfileAthleteId(supabase, uid, match.id);
                if (!cancelled) setAthleteId(match.id);
              }
            }
          }
        }

        const mine = await listMyAthletePhotos(supabase);
        if (!cancelled) setPhotos(mine);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Could not load your picture library.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function chooseAthlete(nextAthleteId: string) {
    if (!userId) return;
    try {
      setError(null);
      await updateProfileAthleteId(supabase, userId, nextAthleteId);
      setAthleteId(nextAthleteId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save selected athlete.");
    }
  }

  async function onUpload(file: File | null) {
    if (!file || !userId || !athleteId) return;
    try {
      setUploading(true);
      setError(null);
      const created = await uploadAthletePhoto(supabase, { athleteId, file, userId });
      setPhotos((prev) => [created, ...prev]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onDelete(photo: AthletePhoto) {
    try {
      setError(null);
      await deleteAthletePhoto(supabase, photo);
      setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete photo.");
    }
  }

  if (!mounted || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="athlete" />
      <main className="pt-20 px-6 pb-16 max-w-6xl mx-auto">
        <div className="pt-8 mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/athlete"
              className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to portal
            </Link>
            <h1 className="text-2xl font-bold text-foreground">My Pictures</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Upload photos you want your designer to use when creating posters.
            </p>
          </div>
          <label
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
              athleteId && !uploading
                ? "bg-primary/10 border-primary/20 text-primary cursor-pointer hover:bg-primary/20"
                : "bg-muted border-border/50 text-muted-foreground cursor-not-allowed"
            }`}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? "Uploading..." : "Upload photo"}
            <input
              type="file"
              className="sr-only"
              accept="image/jpeg,image/png,image/gif,image/webp"
              disabled={!athleteId || uploading}
              onChange={(e) => {
                void onUpload(e.target.files?.[0] ?? null);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!userId && (
          <div className="rounded-xl border border-border/50 bg-card p-6 text-sm text-muted-foreground">
            Sign in first to manage your picture library.
          </div>
        )}

        {userId && (
          <>
            <div className="rounded-xl border border-border/50 bg-card p-4 mb-6">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Linked athlete identity
              </div>
              {!teamId ? (
                <p className="text-sm text-muted-foreground">
                  Your account is not linked to a team yet. Join your team first, then upload photos.
                </p>
              ) : roster.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No athletes found for your team yet. Ask your designer to add roster athletes first.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                  {roster.map((athlete) => {
                    const active = athleteId === athlete.id;
                    return (
                      <button
                        key={athlete.id}
                        type="button"
                        onClick={() => void chooseAthlete(athlete.id)}
                        className={`text-left rounded-xl border p-3 transition-all ${
                          active
                            ? "border-primary/40 bg-primary/10 text-primary"
                            : "border-border/50 bg-background text-foreground hover:border-border"
                        }`}
                      >
                        <div className="font-semibold text-sm">{athlete.fullName}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {athlete.number ? `#${athlete.number}` : "No number"}
                          {athlete.position ? ` · ${athlete.position}` : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/50 bg-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">Picture Library</h2>
                <span className="text-xs text-muted-foreground">{photos.length} total</span>
              </div>

              {photos.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground/60">
                  <User className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
                  <p className="text-sm">No photos uploaded yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {photos.map((photo) => (
                    <div key={photo.id} className="group relative rounded-xl overflow-hidden border border-border/50 bg-muted">
                      <div className="relative aspect-square">
                        <Image src={photo.public_url} alt={photo.original_name ?? "Athlete photo"} fill className="object-cover" unoptimized />
                      </div>
                      <button
                        type="button"
                        onClick={() => void onDelete(photo)}
                        className="absolute top-2 right-2 p-1.5 rounded-md bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
