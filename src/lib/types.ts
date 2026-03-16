export type Role = "designer" | "athlete" | "student";

export interface Profile {
  id: string;
  role: Role;
  full_name: string | null;
  email: string | null;
  created_at: string;
}

// Supabase generated types (minimal — expand as schema grows)
export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Omit<Profile, "created_at"> & { created_at?: string };
        Update: Partial<Omit<Profile, "id">>;
      };
      schools: {
        Row: { id: string; name: string; manager_id: string; created_at: string; updated_at: string };
        Insert: { id?: string; name: string; manager_id: string; created_at?: string; updated_at?: string };
        Update: Partial<{ name: string; manager_id: string; updated_at: string }>;
      };
      teams: {
        Row: { id: string; school_id: string; team_name: string; sport: string; season: string; created_at: string; updated_at: string };
        Insert: { id?: string; school_id: string; team_name: string; sport: string; season: string; created_at?: string; updated_at?: string };
        Update: Partial<{ school_id: string; team_name: string; sport: string; season: string; updated_at: string }>;
      };
      athletes: {
        Row: { id: string; team_id: string; full_name: string; number: string | null; position: string | null; created_at: string };
        Insert: { id?: string; team_id: string; full_name: string; number?: string | null; position?: string | null; created_at?: string };
        Update: Partial<{ team_id: string; full_name: string; number: string | null; position: string | null }>;
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
