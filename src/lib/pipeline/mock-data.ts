import type { Athlete, Team } from "@/lib/pipeline/types";

export const MOCK_TEAMS: Team[] = [
  {
    id: "team-1",
    schoolName: "Ridgeline High",
    teamName: "Lions",
    sport: "Football",
    season: "2025-2026",
  },
  {
    id: "team-2",
    schoolName: "Ridgeline High",
    teamName: "Tigers",
    sport: "Basketball",
    season: "2025-2026",
  },
];

export const MOCK_ATHLETES: Athlete[] = [
  { id: "ath-1", teamId: "team-1", fullName: "Jordan Miles", number: "7", position: "QB" },
  { id: "ath-2", teamId: "team-1", fullName: "Sam Carter", number: "22", position: "RB" },
  { id: "ath-3", teamId: "team-1", fullName: "Avery Chen", number: "11", position: "WR" },
  { id: "ath-4", teamId: "team-2", fullName: "Riley Park", number: "3", position: "G" },
  { id: "ath-5", teamId: "team-2", fullName: "Taylor Nguyen", number: "14", position: "F" },
];

