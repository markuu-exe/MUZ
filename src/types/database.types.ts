export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          instrument_focus: string;
          current_streak: number;
          last_activity_date: string | null;
          exp: number;
          hearts: number;
          created_at: string | null;
        };
        Insert: {
          id: string;
          username: string;
          instrument_focus?: string;
          current_streak?: number;
          last_activity_date?: string | null;
          exp?: number;
          hearts?: number;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
        Relationships: [];
      };
      lessons: {
        Row: {
          id: string;
          instrument: string;
          module_index: number;
          node_index: number;
          title: string;
          description: string | null;
          required_exp: number;
          payload: Json;
        };
        Insert: Database['public']['Tables']['lessons']['Row'];
        Update: Partial<Database['public']['Tables']['lessons']['Row']>;
        Relationships: [];
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          accuracy_percentage: number | null;
          posture_stability_score: number | null;
          unlocked_at: string | null;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          accuracy_percentage?: number | null;
          posture_stability_score?: number | null;
          unlocked_at?: string | null;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_progress']['Row']>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Lesson = Database['public']['Tables']['lessons']['Row'];
export type UserProgress = Database['public']['Tables']['user_progress']['Row'];
