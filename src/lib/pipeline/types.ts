export type PostType = "gameday" | "hype" | "announcement";

export type Team = {
  id: string;
  schoolName: string;
  teamName: string;
  sport: string;
  season: string;
};

export type Athlete = {
  id: string;
  teamId: string;
  fullName: string;
  number?: string;
  position?: string;
};

export type GameEvent = {
  id: string;
  opponent: string;
  dateTime: string | null;
  dateText?: string;
  timeText?: string;
  location?: string;
  homeAway?: "home" | "away" | "neutral" | string;
};

export type PostDraft = {
  teamId: string | null;
  athleteIds: string[];
  postType: PostType;
  eventId: string | null;
  captionNotes: string;
};

export type GenerationRequest = {
  team: Team;
  athletes: Athlete[];
  event: GameEvent;
  postType: PostType;
  captionNotes?: string;
  createdAt: string; // ISO
};

