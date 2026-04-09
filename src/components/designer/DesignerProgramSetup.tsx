"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar, ChevronDown, ChevronRight, Link2, Plus, Users } from "lucide-react";

import { ScheduleImporter } from "@/components/schedule/ScheduleImporter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SPORTS } from "@/lib/mock-data";
import { createClient } from "@/lib/supabase/client";
import { getAthletesForTeam, insertAthlete } from "@/lib/supabase/athletes";
import { ensureSchoolForDesigner, getSchoolForDesigner } from "@/lib/supabase/schools";
import { getTeamsForDesigner, createTeamForDesigner } from "@/lib/supabase/teams";
import { replaceTeamScheduleFromImport, getSchedulesForTeam } from "@/lib/supabase/schedules";
import { formatSupabaseError } from "@/lib/supabase/errors";
import type { Athlete, Team } from "@/lib/pipeline/types";
import type { ImportedGameEvent } from "@/lib/schedule/parseCsv";
import type { TeamInstagramRow } from "@/lib/instagram/teamInstagram";

function InstagramGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
    </svg>
  );
}

function defaultSeasonLabel(): string {
  const now = new Date();
  const y = now.getFullYear();
  const start = now.getMonth() >= 6 ? y : y - 1;
  return `${start}-${start + 1}`;
}

type Props = {
  onProgramUpdated: () => void;
};

export function DesignerProgramSetup({ onProgramUpdated }: Props) {
  const supabase = useMemo(() => createClient(), []);
  const [signedIn, setSignedIn] = useState(false);
  const [busy, setBusy] = useState(true);
  const [schoolExists, setSchoolExists] = useState(false);
  const [orgName, setOrgName] = useState("My school");
  const [teams, setTeams] = useState<Team[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [athletesByTeam, setAthletesByTeam] = useState<Record<string, Athlete[]>>({});

  const [newTeamName, setNewTeamName] = useState("");
  const [newSport, setNewSport] = useState("Basketball");
  const [newSeason, setNewSeason] = useState(defaultSeasonLabel);
  const [addTeamBusy, setAddTeamBusy] = useState(false);
  const [addTeamErr, setAddTeamErr] = useState<string | null>(null);
  const [playerErr, setPlayerErr] = useState<string | null>(null);

  const [playerName, setPlayerName] = useState("");
  const [playerNum, setPlayerNum] = useState("");
  const [playerPos, setPlayerPos] = useState("");
  const [addPlayerBusy, setAddPlayerBusy] = useState(false);
  const [scheduleMsg, setScheduleMsg] = useState<string | null>(null);
  const [teamIgRows, setTeamIgRows] = useState<TeamInstagramRow[]>([]);

  const load = useCallback(async () => {
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setSignedIn(Boolean(user));
      if (!user) {
        setTeams([]);
        setTeamIgRows([]);
        setSchoolExists(false);
        return;
      }
      const school = await getSchoolForDesigner(supabase);
      setSchoolExists(Boolean(school));
      if (school) setOrgName(school.name);
      const [list, igRes] = await Promise.all([
        getTeamsForDesigner(supabase),
        fetch("/api/instagram/teams", { credentials: "include" })
          .then((r) => r.json())
          .catch(() => ({})),
      ]);
      setTeams(list);
      setTeamIgRows(Array.isArray(igRes.teams) ? igRes.teams : []);
    } catch {
      setTeams([]);
      setTeamIgRows([]);
    } finally {
      setBusy(false);
    }
  }, [supabase]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setPlayerName("");
    setPlayerNum("");
    setPlayerPos("");
  }, [expandedId]);

  useEffect(() => {
    if (!expandedId) return;
    let cancelled = false;
    getAthletesForTeam(supabase, expandedId)
      .then((list) => {
        if (!cancelled) setAthletesByTeam((p) => ({ ...p, [expandedId]: list }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [expandedId, supabase, teams]);

  async function handleAddTeam(e: React.FormEvent) {
    e.preventDefault();
    setAddTeamErr(null);
    if (!newTeamName.trim()) {
      setAddTeamErr("Team name is required.");
      return;
    }
    setAddTeamBusy(true);
    try {
      const school = await ensureSchoolForDesigner(supabase, orgName.trim() || "My school");
      setSchoolExists(true);
      const created = await createTeamForDesigner(supabase, {
        school_id: school.id,
        school_name: school.name,
        team_name: newTeamName.trim(),
        sport: newSport.trim() || "Sport",
        season: newSeason.trim() || defaultSeasonLabel(),
      });
      setNewTeamName("");
      await load();
      setExpandedId(created.id);
      onProgramUpdated();
    } catch (err) {
      setAddTeamErr(formatSupabaseError(err));
    } finally {
      setAddTeamBusy(false);
    }
  }

  async function handleAddPlayer(e: React.FormEvent, teamId: string) {
    e.preventDefault();
    if (!expandedId || !playerName.trim()) return;
    setAddPlayerBusy(true);
    setPlayerErr(null);
    try {
      await insertAthlete(supabase, {
        team_id: teamId,
        full_name: playerName.trim(),
        number: playerNum.trim() || null,
        position: playerPos.trim() || null,
      });
      setPlayerName("");
      setPlayerNum("");
      setPlayerPos("");
      const list = await getAthletesForTeam(supabase, teamId);
      setAthletesByTeam((p) => ({ ...p, [teamId]: list }));
      onProgramUpdated();
    } catch (err) {
      setPlayerErr(formatSupabaseError(err));
    } finally {
      setAddPlayerBusy(false);
    }
  }

  async function handleScheduleImport(teamId: string, events: ImportedGameEvent[]) {
    setScheduleMsg(null);
    try {
      await replaceTeamScheduleFromImport(supabase, teamId, events);
      const rows = await getSchedulesForTeam(supabase, teamId);
      setScheduleMsg(`Imported ${rows.length} game${rows.length === 1 ? "" : "s"}.`);
      onProgramUpdated();
    } catch (err) {
      setScheduleMsg(formatSupabaseError(err));
    }
  }

  if (busy) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 mb-6 text-sm text-muted-foreground">
        Loading program data…
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="rounded-xl border border-border/50 bg-card p-5 mb-6 text-sm text-muted-foreground">
        Sign in to add teams, rosters, and schedules. They appear here and in the Generator.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border/50 bg-card p-5 mb-6 space-y-5">
      <div className="flex items-start gap-3">
        <Users className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div>
          <h2 className="text-sm font-semibold text-foreground">Teams, players & schedules</h2>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Add each team once, connect its{" "}
            <span className="text-foreground/80 font-medium">Instagram Business</span> account (expand the team), roster
            players, then upload the season schedule (Excel or CSV). In{" "}
            <span className="text-foreground/80 font-medium">Generator</span>, you&apos;ll pick the team, featured
            athletes, and match from that schedule.
          </p>
        </div>
      </div>

      <form onSubmit={handleAddTeam} className="rounded-lg border border-border/40 bg-background/40 p-4 space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Add a team</p>
        {!schoolExists && (
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              School / organization name
            </label>
            <Input
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="e.g. Trinity"
              className="h-9"
            />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-1">
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Team label
            </label>
            <Input
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Men&apos;s Squash"
              className="h-9"
            />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Sport
            </label>
            <Input
              value={newSport}
              onChange={(e) => setNewSport(e.target.value)}
              list="designer-sport-options"
              className="h-9"
            />
            <datalist id="designer-sport-options">
              {SPORTS.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1 block">
              Season
            </label>
            <Input value={newSeason} onChange={(e) => setNewSeason(e.target.value)} className="h-9" />
          </div>
        </div>
        {addTeamErr && <p className="text-xs text-destructive">{addTeamErr}</p>}
        <Button type="submit" size="sm" disabled={addTeamBusy}>
          <Plus className="w-3.5 h-3.5" />
          {addTeamBusy ? "Adding…" : "Add team"}
        </Button>
        <p className="text-[10px] text-muted-foreground/80 leading-relaxed">
          After the team appears below, expand it and use{" "}
          <span className="text-foreground/70 font-medium">Connect Instagram</span> to link that program&apos;s IG page
          (Facebook login with Page + Instagram Business).
        </p>
      </form>

      {teams.length === 0 ? (
        <p className="text-xs text-muted-foreground">No teams yet — use the form above to create your first one.</p>
      ) : (
        <ul className="space-y-2">
          {teams.map((t) => {
            const open = expandedId === t.id;
            const athletes = athletesByTeam[t.id] ?? [];
            const igRow = teamIgRows.find((r) => r.id === t.id);
            const igConnected = Boolean(igRow?.igConnected);
            return (
              <li key={t.id} className="rounded-lg border border-border/40 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : t.id)}
                  className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-sm bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                >
                  {open ? <ChevronDown className="w-4 h-4 shrink-0" /> : <ChevronRight className="w-4 h-4 shrink-0" />}
                  <span className="font-medium text-foreground">
                    {[t.schoolName, t.teamName].filter(Boolean).join(" · ") || t.teamName}
                  </span>
                  {igConnected ? (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-pink-400/90 shrink-0 px-1.5 py-0.5 rounded bg-pink-500/10 border border-pink-500/20">
                      IG
                    </span>
                  ) : null}
                  <span className="text-muted-foreground text-xs ml-auto shrink-0">
                    {t.sport} · {t.season}
                  </span>
                </button>
                {open && (
                  <div className="px-3 pb-4 pt-2 border-t border-border/30 space-y-4">
                    <div className="rounded-lg border border-pink-500/15 bg-gradient-to-r from-purple-500/5 to-pink-500/5 p-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <InstagramGlyph className="w-4 h-4 text-pink-300 shrink-0" />
                        <p className="text-[11px] font-semibold text-foreground uppercase tracking-wider">
                          Instagram (this team)
                        </p>
                      </div>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        Link the official Instagram Business account used for this program. You&apos;ll sign in with
                        Facebook and pick the Page that owns the IG profile. Used when publishing from Generator.
                      </p>
                      {igConnected ? (
                        <div className="space-y-1.5">
                          <p className="text-xs text-green-400/90 font-medium">
                            Connected — ready to publish from Generator.
                          </p>
                          <a
                            href={`/api/instagram/connect?teamId=${encodeURIComponent(t.id)}&next=${encodeURIComponent("/designer/team")}`}
                            className="text-[10px] text-muted-foreground hover:text-foreground underline underline-offset-2"
                          >
                            Reconnect or switch Instagram account
                          </a>
                        </div>
                      ) : (
                        <a
                          href={`/api/instagram/connect?teamId=${encodeURIComponent(t.id)}&next=${encodeURIComponent("/designer/team")}`}
                          className="inline-flex items-center gap-2 text-xs font-semibold text-pink-200 hover:text-pink-100 transition-colors"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          Connect Instagram for this team
                        </a>
                      )}
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                        Players
                      </p>
                      {athletes.length === 0 ? (
                        <p className="text-xs text-muted-foreground mb-2">No players yet.</p>
                      ) : (
                        <ul className="text-xs text-foreground/90 space-y-1 mb-2">
                          {athletes.map((a) => (
                            <li key={a.id}>
                              {a.fullName}
                              {a.number ? ` · #${a.number}` : ""}
                              {a.position ? ` · ${a.position}` : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      <form
                        onSubmit={(e) => handleAddPlayer(e, t.id)}
                        className="flex flex-wrap gap-2 items-end"
                      >
                        <Input
                          placeholder="Full name"
                          value={playerName}
                          onChange={(e) => setPlayerName(e.target.value)}
                          className="h-8 max-w-[160px] text-xs"
                        />
                        <Input
                          placeholder="#"
                          value={playerNum}
                          onChange={(e) => setPlayerNum(e.target.value)}
                          className="h-8 w-14 text-xs"
                        />
                        <Input
                          placeholder="Pos"
                          value={playerPos}
                          onChange={(e) => setPlayerPos(e.target.value)}
                          className="h-8 w-20 text-xs"
                        />
                        <Button type="submit" size="xs" disabled={addPlayerBusy || !playerName.trim()}>
                          Add player
                        </Button>
                      </form>
                      {playerErr && <p className="text-xs text-destructive mt-2">{playerErr}</p>}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-3.5 h-3.5 text-primary" />
                        <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                          Season schedule (replace)
                        </p>
                      </div>
                      <ScheduleImporter onImport={(ev) => void handleScheduleImport(t.id, ev)} />
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {scheduleMsg && (
        <p
          className={`text-xs ${scheduleMsg.startsWith("Imported ") ? "text-primary" : "text-destructive"}`}
        >
          {scheduleMsg}
        </p>
      )}
    </div>
  );
}
