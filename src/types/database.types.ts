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
        Insert: Partial<Database['public']['Tables']['profiles']['Row']>;
        Update: Partial<Database['public']['Tables']['profiles']['Row']>;
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
      };
    };
  };
}
