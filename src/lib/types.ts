export type Role = "designer" | "athlete" | "student";

export type Profile = {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  created_at: string;
};

// Supabase generated types (minimal — expand as schema grows)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
        Relationships: [];
      };
      assets: {
        Row: {
          id: string;
          designer_id: string;
          school_id: string | null;
          team_id: string | null;
          schedule_id: string | null;
          title: string;
          type: "gameday" | "final-score" | "poster" | "highlight";
          status: "draft" | "published" | "archived";
          sport: string;
          home_team: string;
          away_team: string;
          home_score: number | null;
          away_score: number | null;
          event_date: string;
          image_url: string | null;
          image_storage_path: string | null;
          created_at: string;
          updated_at: string;
          published_at: string | null;
        };
        Insert: {
          id?: string;
          designer_id: string;
          school_id?: string | null;
          team_id?: string | null;
          schedule_id?: string | null;
          title: string;
          type: "gameday" | "final-score" | "poster" | "highlight";
          status?: "draft" | "published" | "archived";
          sport: string;
          home_team: string;
          away_team: string;
          home_score?: number | null;
          away_score?: number | null;
          event_date: string;
          image_url?: string | null;
          image_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
          published_at?: string | null;
        };
        Update: Partial<{
          school_id: string | null;
          team_id: string | null;
          schedule_id: string | null;
          title: string;
          type: "gameday" | "final-score" | "poster" | "highlight";
          status: "draft" | "published" | "archived";
          sport: string;
          home_team: string;
          away_team: string;
          home_score: number | null;
          away_score: number | null;
          event_date: string;
          image_url: string | null;
          image_storage_path: string | null;
          updated_at: string;
          published_at: string | null;
        }>;
        Relationships: [];
      };
      asset_likes: {
        Row: { asset_id: string; user_id: string; created_at: string };
        Insert: { asset_id: string; user_id: string; created_at?: string };
        Update: never;
        Relationships: [];
      };
      instagram_accounts: {
        Row: {
          user_id: string;
          ig_user_id: string;
          access_token_encrypted: string;
          connected_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          ig_user_id: string;
          access_token_encrypted: string;
          connected_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          ig_user_id: string;
          access_token_encrypted: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
      schools: {
        Row: { id: string; name: string; manager_id: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; manager_id: string; created_at?: string; updated_at?: string };
        Update: Partial<{ name: string; manager_id: string; updated_at: string }>;
        Relationships: [];
      };
      teams: {
        Row: { id: string; school_id: string; team_name: string; sport: string; season: string; created_at: string; updated_at: string };
        Insert: { id?: string; school_id: string; team_name: string; sport: string; season: string; created_at?: string; updated_at?: string };
        Update: Partial<{ school_id: string; team_name: string; sport: string; season: string; updated_at: string }>;
        Relationships: [];
      };
      athletes: {
        Row: { id: string; team_id: string; full_name: string; number: string | null; position: string | null; created_at: string };
        Insert: { id?: string; team_id: string; full_name: string; number?: string | null; position?: string | null; created_at?: string };
        Update: Partial<{ team_id: string; full_name: string; number: string | null; position: string | null }>;
        Relationships: [];
      };
      schedules: {
        Row: {
          id: string;
          team_id: string;
          opponent: string;
          date_time: string | null;
          date_text: string | null;
          time_text: string | null;
          location: string | null;
          home_away: "home" | "away" | "neutral" | null;
          home_score: number | null;
          away_score: number | null;
          final: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          opponent: string;
          date_time?: string | null;
          date_text?: string | null;
          time_text?: string | null;
          location?: string | null;
          home_away?: "home" | "away" | "neutral" | null;
          home_score?: number | null;
          away_score?: number | null;
          final?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          opponent: string;
          date_time: string | null;
          date_text: string | null;
          time_text: string | null;
          location: string | null;
          home_away: "home" | "away" | "neutral" | null;
          home_score: number | null;
          away_score: number | null;
          final: boolean;
          updated_at: string;
        }>;
        Relationships: [];
      };
      manager_drafts: {
        Row: {
          id: string;
          manager_id: string;
          generation_request: unknown;
          compiled_image_prompt: string | null;
          compiled_caption_prompt: string | null;
          reference_image_ids: unknown;
          editor_copy: unknown;
          editor_layout: unknown;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          manager_id: string;
          generation_request: unknown;
          compiled_image_prompt?: string | null;
          compiled_caption_prompt?: string | null;
          reference_image_ids?: unknown;
          editor_copy?: unknown;
          editor_layout?: unknown;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          generation_request: unknown;
          compiled_image_prompt: string | null;
          compiled_caption_prompt: string | null;
          reference_image_ids: unknown;
          editor_copy: unknown;
          editor_layout: unknown;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      role: Role;
    };
  };
}

export const ROLE_ROUTES: Record<Role, string> = {
  designer: "/designer",
  athlete: "/athlete",
  student: "/feed",
};

export const ROLE_LABELS: Record<Role, string> = {
  designer: "Designer",
  athlete: "Athlete",
  student: "Student",
};
