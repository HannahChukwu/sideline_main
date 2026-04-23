"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Calendar, Users, Link2, Loader2 } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { getTeamsForDesigner } from "@/lib/supabase/teams";
import { getSchedulesForTeam, type ScheduleRow } from "@/lib/supabase/schedules";
import type { Team } from "@/lib/pipeline/types";
import { formatScheduleRowOptionLabel } from "@/lib/schedule/applyScheduleToForm";
import { DesignerProgramSetup } from "@/components/designer/DesignerProgramSetup";

export default function DesignerTeamPage() {
  const [mounted, setMounted] = useState(false);
  const [schoolTeams, setSchoolTeams] = useState<Team[]>([]);
  const [scheduleForTeamId, setScheduleForTeamId] = useState<string | null>(null);
  const [inviteTeamId, setInviteTeamId] = useState<string | null>(null);
  const [dashboardSchedule, setDashboardSchedule] = useState<ScheduleRow[]>([]);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteMsg, setInviteMsg] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const reloadSchoolTeams = useCallback(() => {
    const supabase = createClient();
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session?.user) {
        setSchoolTeams([]);
        setScheduleForTeamId(null);
        setInviteTeamId(null);
        return;
      }
      getTeamsForDesigner(supabase)
        .then((teams) => {
          if (teams.length === 0) {
            setSchoolTeams([]);
            setScheduleForTeamId(null);
            setInviteTeamId(null);
            return;
          }
          setSchoolTeams(teams);
          setScheduleForTeamId((prev) => {
            if (prev && teams.some((t) => t.id === prev)) return prev;
            return teams[0].id;
          });
          setInviteTeamId((prev) => {
            if (prev && teams.some((t) => t.id === prev)) return prev;
            return teams[0].id;
          });
        })
        .catch(() => {
          setSchoolTeams([]);
          setScheduleForTeamId(null);
          setInviteTeamId(null);
        });
    });
  }, []);

  useEffect(() => {
    reloadSchoolTeams();
  }, [reloadSchoolTeams]);

  useEffect(() => {
    let cancelled = false;
    if (!scheduleForTeamId) {
      setDashboardSchedule([]);
      return;
    }
    const supabase = createClient();
    getSchedulesForTeam(supabase, scheduleForTeamId)
      .then((rows) => {
        if (!cancelled) setDashboardSchedule(rows);
      })
      .catch(() => {
        if (!cancelled) setDashboardSchedule([]);
      });
    return () => {
      cancelled = true;
    };
  }, [scheduleForTeamId]);

  const scheduleTeam = schoolTeams.find((t) => t.id === scheduleForTeamId) ?? null;

  async function copyAthleteInvite() {
    if (!inviteTeamId) return;
    setInviteBusy(true);
    setInviteMsg(null);
    try {
      const res = await fetch("/api/team-invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ team_id: inviteTeamId }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok) {
        throw new Error(typeof data.error === "string" ? data.error : "Could not create invite link.");
      }
      if (!data.url) throw new Error("Missing URL in response.");
      await navigator.clipboard.writeText(data.url);
      setInviteMsg("Copied. Link expires in 14 days. Recipients sign in as athletes and open the link.");
    } catch (e) {
      setInviteMsg(e instanceof Error ? e.message : "Could not copy link.");
    } finally {
      setInviteBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar role="designer" />

      <main className="pt-20 px-6 pb-16 max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8 pt-8">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">Designer</p>
            <h1 className="text-3xl font-bold text-foreground">Team</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-xl">
              Manage team setup in one place. Use the sections below for different jobs: configure each team and roster,
              create athlete invite links, and review imported schedules used by Generator match selection.
            </p>
          </div>
          <Link
            href="/designer/create"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shrink-0"
          >
            Open Generator
          </Link>
        </div>

        {mounted && (
          <section className="mb-6 rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Section 1
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team setup</p>
            </div>
            <DesignerProgramSetup onProgramUpdated={reloadSchoolTeams} />
          </section>
        )}

        {mounted && schoolTeams.length > 0 && (
          <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 mb-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Section 2
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Athlete invites</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary shrink-0" />
              <h2 className="text-sm font-semibold text-foreground">Athlete invite links</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              This section only controls invite links. Team setup, player edits, schedule import, and Instagram
              connection are managed in the team rows above.
            </p>
            <ul className="text-sm text-foreground/90 space-y-1.5">
              {schoolTeams.map((t) => (
                <li key={t.id}>
                  <span className="text-muted-foreground">·</span>{" "}
                  {[t.schoolName, t.teamName].filter(Boolean).join(" · ") || t.teamName}
                  <span className="text-muted-foreground"> — {t.sport}</span>
                </li>
              ))}
            </ul>
            <div className="pt-3 border-t border-border/40 space-y-2">
              <p className="text-xs text-muted-foreground leading-relaxed">
                <span className="font-semibold text-foreground/80">What this does:</span> Creates a signed invite link
                (14-day expiry). Athlete or student users sign in, open the link, and are linked to the selected team.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                {schoolTeams.length > 1 && (
                  <select
                    value={inviteTeamId ?? ""}
                    onChange={(e) => setInviteTeamId(e.target.value || null)}
                    className="w-full sm:w-auto px-3 py-2.5 rounded-xl bg-background border border-border/50 text-sm text-foreground focus:outline-none focus:border-primary/40"
                  >
                    {schoolTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {[t.schoolName, t.teamName].filter(Boolean).join(" · ") || t.teamName}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => void copyAthleteInvite()}
                  disabled={inviteBusy || !inviteTeamId}
                  className={cn(
                    "inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all",
                    inviteTeamId && !inviteBusy
                      ? "bg-primary/15 border-primary/30 text-primary hover:bg-primary/20"
                      : "bg-muted/30 border-border/50 text-muted-foreground cursor-not-allowed"
                  )}
                >
                  {inviteBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link2 className="w-4 h-4" />}
                  Copy athlete invite link
                </button>
              </div>
              {inviteMsg && <p className="text-xs text-muted-foreground leading-relaxed">{inviteMsg}</p>}
            </div>
            </div>
          </section>
        )}

        {mounted && scheduleTeam && (
          <section className="rounded-2xl border border-border/60 bg-card/60 p-3 sm:p-4 mb-6">
            <div className="mb-3 flex items-center gap-2">
              <span className="inline-flex items-center rounded-md border border-primary/25 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Section 3
              </span>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Schedule preview</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-card p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary shrink-0" />
                <h2 className="text-sm font-semibold text-foreground">Schedule preview (read-only)</h2>
              </div>
              <div className="flex items-center gap-2 sm:ml-auto">
                {schoolTeams.length > 1 && (
                  <select
                    value={scheduleForTeamId ?? ""}
                    onChange={(e) => setScheduleForTeamId(e.target.value || null)}
                    className="px-3 py-2 rounded-lg bg-background border border-border/50 text-xs text-foreground focus:outline-none focus:border-primary/40 max-w-[220px]"
                  >
                    {schoolTeams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.teamName}
                      </option>
                    ))}
                  </select>
                )}
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  Import or replace schedules inside each expanded team row
                </span>
              </div>
            </div>
            {dashboardSchedule.length === 0 ? (
              <p className="text-xs text-muted-foreground leading-relaxed">
                No games loaded yet. Expand a team above and upload Excel or CSV; games show here and in Generator.
              </p>
            ) : (
              <>
                <p className="text-[11px] text-muted-foreground mb-3">
                  {[scheduleTeam.schoolName, scheduleTeam.teamName].filter(Boolean).join(" · ")} ·{" "}
                  {dashboardSchedule.length} game{dashboardSchedule.length === 1 ? "" : "s"}
                </p>
                <ul className="space-y-2 max-h-[min(70vh,40rem)] overflow-y-auto pr-1">
                  {dashboardSchedule.map((row) => (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 text-sm border-b border-border/30 pb-2 last:border-0 last:pb-0"
                    >
                      <span className="text-foreground/90 min-w-0">
                        {formatScheduleRowOptionLabel(scheduleTeam, row)}
                      </span>
                      {row.final && (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground shrink-0">
                          Final
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
