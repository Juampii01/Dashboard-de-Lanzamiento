export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          hotmart_transaction_id: string | null;
          access_starts_at: string | null;
          access_expires_at: string | null;
          is_admin: boolean;
          total_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          hotmart_transaction_id?: string | null;
          access_starts_at?: string | null;
          access_expires_at?: string | null;
          is_admin?: boolean;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          hotmart_transaction_id?: string | null;
          access_starts_at?: string | null;
          access_expires_at?: string | null;
          is_admin?: boolean;
          total_points?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      company_profiles: {
        Row: {
          id: string;
          user_id: string;
          company_name: string;
          year_founded: number | null;
          employee_count: number | null;
          niche: string | null;
          problem_solved: string | null;
          target_avatar: string | null;
          previous_acquisition_methods: string | null;
          primary_naics: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          company_name: string;
          year_founded?: number | null;
          employee_count?: number | null;
          niche?: string | null;
          problem_solved?: string | null;
          target_avatar?: string | null;
          previous_acquisition_methods?: string | null;
          primary_naics?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          company_name?: string;
          year_founded?: number | null;
          employee_count?: number | null;
          niche?: string | null;
          problem_solved?: string | null;
          target_avatar?: string | null;
          previous_acquisition_methods?: string | null;
          primary_naics?: string | null;
          updated_at?: string;
        };
      };
      naics_expansions: {
        Row: {
          id: string;
          user_id: string;
          primary_naics: string;
          related_codes: Json;
          keywords_input: string[];
          keywords_expanded: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          primary_naics: string;
          related_codes?: Json;
          keywords_input?: string[];
          keywords_expanded?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          primary_naics?: string;
          related_codes?: Json;
          keywords_input?: string[];
          keywords_expanded?: string[];
          updated_at?: string;
        };
      };
      web_previews: {
        Row: {
          id: string;
          user_id: string;
          generated_html: string | null;
          generated_css: string | null;
          portal_list_snapshot: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          generated_html?: string | null;
          generated_css?: string | null;
          portal_list_snapshot?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          generated_html?: string | null;
          generated_css?: string | null;
          portal_list_snapshot?: Json | null;
          updated_at?: string;
        };
      };
      capability_statements: {
        Row: {
          id: string;
          user_id: string;
          statement_data: Json;
          pdf_storage_path: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          statement_data: Json;
          pdf_storage_path?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          statement_data?: Json;
          pdf_storage_path?: string | null;
          updated_at?: string;
        };
      };
      day_progress: {
        Row: {
          id: string;
          user_id: string;
          day_number: number;
          is_unlocked: boolean;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          day_number: number;
          is_unlocked?: boolean;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          is_unlocked?: boolean;
          is_completed?: boolean;
          completed_at?: string | null;
          updated_at?: string;
        };
      };
      video_capsule_completions: {
        Row: {
          id: string;
          user_id: string;
          capsule_id: string;
          completed_at: string;
          points_earned: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          capsule_id: string;
          completed_at?: string;
          points_earned?: number;
          created_at?: string;
        };
        Update: never;
      };
      sorteo_submissions: {
        Row: {
          id: string;
          user_id: string;
          all_deliverables_uploaded: boolean;
          submitted_at: string | null;
          eligible: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          all_deliverables_uploaded?: boolean;
          submitted_at?: string | null;
          eligible?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          all_deliverables_uploaded?: boolean;
          submitted_at?: string | null;
          eligible?: boolean;
          updated_at?: string;
        };
      };
      admin_toggles: {
        Row: {
          day_number: number;
          is_globally_unlocked: boolean;
          unlocked_at: string | null;
          updated_at: string;
        };
        Insert: {
          day_number: number;
          is_globally_unlocked?: boolean;
          unlocked_at?: string | null;
          updated_at?: string;
        };
        Update: {
          is_globally_unlocked?: boolean;
          unlocked_at?: string | null;
          updated_at?: string;
        };
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
