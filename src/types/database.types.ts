export type Json = string | number | boolean | null | Json[] | { [key: string]: Json };

/**
 * Mirrors supabase/migrations/20260509120000_initial_schema.sql (COURSE-2).
 * The previous version declared `user_progress.profile_id`, which does not exist
 * in the schema (the column is `user_id`), so every progress query returned nothing.
 */
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
          last_heart_update: string | null;
          created_at: string | null;
          /**
           * AUX-TEST-ACCESS-01 developer lesson-access flag (default false). Optional because
           * demo profiles and pre-migration databases do not carry it. The app never writes it;
           * the guard trigger ignores any client write to it.
           */
          is_dev?: boolean;
        };
        Insert: {
          id: string;
          username?: string;
          instrument_focus?: string;
          current_streak?: number;
          last_activity_date?: string | null;
          exp?: number;
          hearts?: number;
          last_heart_update?: string | null;
          created_at?: string | null;
          /** Accepted by the API but ignored for client roles (guard trigger); listed so whole-row writes type-check. */
          is_dev?: boolean;
        };
        Update: {
          id?: string;
          username?: string;
          instrument_focus?: string;
          current_streak?: number;
          last_activity_date?: string | null;
          exp?: number;
          hearts?: number;
          last_heart_update?: string | null;
          created_at?: string | null;
          /** Accepted by the API but ignored for client roles (guard trigger); listed so whole-row writes type-check. */
          is_dev?: boolean;
        };
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
        Insert: {
          id?: string;
          instrument: string;
          module_index: number;
          node_index: number;
          title: string;
          description?: string | null;
          required_exp?: number;
          payload: Json;
        };
        Update: {
          id?: string;
          instrument?: string;
          module_index?: number;
          node_index?: number;
          title?: string;
          description?: string | null;
          required_exp?: number;
          payload?: Json;
        };
        Relationships: [];
      };
      user_progress: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          completed: boolean;
          accuracy_percentage: number;
          posture_stability_score: number;
          unlocked_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          completed?: boolean;
          accuracy_percentage?: number;
          posture_stability_score?: number;
          unlocked_at?: string;
          completed_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_progress']['Row']>;
        Relationships: [];
      };
      performance_records: {
        Row: {
          id: string;
          user_id: string;
          lesson_id: string;
          session_timestamp: string;
          pitch_accuracy: number;
          rhythm_consistency: number;
          posture_score: number;
          drill_duration_sec: number;
        };
        Insert: {
          id?: string;
          user_id: string;
          lesson_id: string;
          session_timestamp?: string;
          pitch_accuracy: number;
          rhythm_consistency: number;
          posture_score: number;
          drill_duration_sec: number;
        };
        Update: Partial<Database['public']['Tables']['performance_records']['Row']>;
        Relationships: [];
      };
      achievements: {
        Row: { id: string; title: string; exp_reward: number };
        Insert: { id: string; title: string; exp_reward?: number };
        Update: Partial<{ id: string; title: string; exp_reward: number }>;
        Relationships: [];
      };
      user_achievements: {
        Row: { user_id: string; achievement_id: string; unlocked_at: string };
        Insert: { user_id: string; achievement_id: string; unlocked_at?: string };
        Update: Partial<{ user_id: string; achievement_id: string; unlocked_at: string }>;
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type Lesson = Database['public']['Tables']['lessons']['Row'];
export type UserProgress = Database['public']['Tables']['user_progress']['Row'];
export type PerformanceRecord = Database['public']['Tables']['performance_records']['Row'];
