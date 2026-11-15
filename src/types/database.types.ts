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
          username?: string;
          instrument_focus?: string;
          current_streak?: number;
          last_activity_date?: string | null;
          exp?: number;
          hearts?: number;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          username?: string;
          instrument_focus?: string;
          current_streak?: number;
          last_activity_date?: string | null;
          exp?: number;
          hearts?: number;
          created_at?: string | null;
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
          user_id?: string;
          profile_id?: string;
          lesson_id: string;
          completed: boolean;
          accuracy_percentage?: number;
          posture_stability_score?: number;
          unlocked_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Insert: {
          id?: string;
          user_id?: string;
          profile_id?: string;
          lesson_id: string;
          completed?: boolean;
          accuracy_percentage?: number;
          posture_stability_score?: number;
          unlocked_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          profile_id?: string;
          lesson_id?: string;
          completed?: boolean;
          accuracy_percentage?: number;
          posture_stability_score?: number;
          unlocked_at?: string | null;
          completed_at?: string | null;
          created_at?: string | null;
          updated_at?: string | null;
        };
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
        Update: {
          id?: string;
          user_id?: string;
          lesson_id?: string;
          session_timestamp?: string;
          pitch_accuracy?: number;
          rhythm_consistency?: number;
          posture_score?: number;
          drill_duration_sec?: number;
        };
        Relationships: [];
      };
      achievements: {
        Row: {
          id: string;
          title: string;
          exp_reward: number;
        };
        Insert: {
          id: string;
          title: string;
          exp_reward?: number;
        };
        Update: {
          id?: string;
          title?: string;
          exp_reward?: number;
        };
        Relationships: [];
      };
      user_achievements: {
        Row: {
          user_id: string;
          achievement_id: string;
          unlocked_at: string;
        };
        Insert: {
          user_id: string;
          achievement_id: string;
          unlocked_at?: string;
        };
        Update: {
          user_id?: string;
          achievement_id?: string;
          unlocked_at?: string;
        };
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
export type AchievementRow = Database['public']['Tables']['achievements']['Row'];
export type UserAchievementRow = Database['public']['Tables']['user_achievements']['Row'];
