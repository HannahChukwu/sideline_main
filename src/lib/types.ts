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
