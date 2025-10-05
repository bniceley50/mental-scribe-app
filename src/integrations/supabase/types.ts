export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          consent_id: string | null
          created_at: string
          data_classification: Database["public"]["Enums"]["data_classification"]
          id: string
          ip_address: string | null
          metadata: Json | null
          part2_disclosure_purpose: string | null
          program_id: string | null
          purpose: string | null
          resource_id: string | null
          resource_type: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          consent_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          part2_disclosure_purpose?: string | null
          program_id?: string | null
          purpose?: string | null
          resource_id?: string | null
          resource_type: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          consent_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          part2_disclosure_purpose?: string | null
          program_id?: string | null
          purpose?: string | null
          resource_id?: string | null
          resource_type?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_reports: {
        Row: {
          created_at: string
          end_date: string
          generated_by: string
          id: string
          report_data: Json
          report_type: string
          start_date: string
        }
        Insert: {
          created_at?: string
          end_date: string
          generated_by: string
          id?: string
          report_data: Json
          report_type: string
          start_date: string
        }
        Update: {
          created_at?: string
          end_date?: string
          generated_by?: string
          id?: string
          report_data?: Json
          report_type?: string
          start_date?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          data_classification: Database["public"]["Enums"]["data_classification"]
          id: string
          is_part2_protected: boolean
          part2_consent_date: string | null
          part2_consent_expiry: string | null
          part2_consent_status: string | null
          program_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          is_part2_protected?: boolean
          part2_consent_date?: string | null
          part2_consent_expiry?: string | null
          part2_consent_status?: string | null
          program_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          is_part2_protected?: boolean
          part2_consent_date?: string | null
          part2_consent_expiry?: string | null
          part2_consent_status?: string | null
          program_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      disclosure_consents: {
        Row: {
          artifact_hash: string
          created_at: string
          created_by: string
          id: string
          purpose: string
          revoked_at: string | null
          scope: Json
          subject_external_id: string
          updated_at: string
          valid_from: string
          valid_until: string | null
        }
        Insert: {
          artifact_hash: string
          created_at?: string
          created_by: string
          id?: string
          purpose: string
          revoked_at?: string | null
          scope: Json
          subject_external_id: string
          updated_at?: string
          valid_from: string
          valid_until?: string | null
        }
        Update: {
          artifact_hash?: string
          created_at?: string
          created_by?: string
          id?: string
          purpose?: string
          revoked_at?: string | null
          scope?: Json
          subject_external_id?: string
          updated_at?: string
          valid_from?: string
          valid_until?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          data_classification: Database["public"]["Enums"]["data_classification"]
          id: string
          is_part2_protected: boolean
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          is_part2_protected?: boolean
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          id?: string
          is_part2_protected?: boolean
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      part2_consents: {
        Row: {
          consent_type: string
          conversation_id: string
          created_at: string
          disclosure_purpose: string | null
          expiry_date: string | null
          granted_date: string
          id: string
          recipient_info: Json | null
          revoked_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          consent_type: string
          conversation_id: string
          created_at?: string
          disclosure_purpose?: string | null
          expiry_date?: string | null
          granted_date?: string
          id?: string
          recipient_info?: Json | null
          revoked_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          consent_type?: string
          conversation_id?: string
          created_at?: string
          disclosure_purpose?: string | null
          expiry_date?: string | null
          granted_date?: string
          id?: string
          recipient_info?: Json | null
          revoked_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "part2_consents_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_identity_links: {
        Row: {
          created_at: string
          external_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          external_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          external_id?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string
          id: string
          is_part2: boolean
          name: string
          org_unit_code: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_part2?: boolean
          name: string
          org_unit_code?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_part2?: boolean
          name?: string
          org_unit_code?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      structured_notes: {
        Row: {
          client_perspective: string | null
          clinical_impression: string | null
          conversation_id: string
          created_at: string
          current_status: string | null
          data_classification: Database["public"]["Enums"]["data_classification"]
          goals_progress: string | null
          id: string
          is_part2_protected: boolean
          is_telehealth: boolean | null
          new_issues_details: string | null
          new_issues_presented: boolean | null
          next_steps: string | null
          program_id: string | null
          response_to_interventions: string | null
          safety_assessment: string | null
          session_date: string
          treatment_plan: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          client_perspective?: string | null
          clinical_impression?: string | null
          conversation_id: string
          created_at?: string
          current_status?: string | null
          data_classification?: Database["public"]["Enums"]["data_classification"]
          goals_progress?: string | null
          id?: string
          is_part2_protected?: boolean
          is_telehealth?: boolean | null
          new_issues_details?: string | null
          new_issues_presented?: boolean | null
          next_steps?: string | null
          program_id?: string | null
          response_to_interventions?: string | null
          safety_assessment?: string | null
          session_date?: string
          treatment_plan?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          client_perspective?: string | null
          clinical_impression?: string | null
          conversation_id?: string
          created_at?: string
          current_status?: string | null
          data_classification?: Database["public"]["Enums"]["data_classification"]
          goals_progress?: string | null
          id?: string
          is_part2_protected?: boolean
          is_telehealth?: boolean | null
          new_issues_details?: string | null
          new_issues_presented?: boolean | null
          next_steps?: string | null
          program_id?: string | null
          response_to_interventions?: string | null
          safety_assessment?: string | null
          session_date?: string
          treatment_plan?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "structured_notes_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "structured_notes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      uploaded_files: {
        Row: {
          conversation_id: string
          created_at: string
          file_name: string
          file_type: string
          file_url: string
          id: string
          processed_content: string | null
          program_id: string | null
        }
        Insert: {
          conversation_id: string
          created_at?: string
          file_name: string
          file_type: string
          file_url: string
          id?: string
          processed_content?: string | null
          program_id?: string | null
        }
        Update: {
          conversation_id?: string
          created_at?: string
          file_name?: string
          file_type?: string
          file_url?: string
          id?: string
          processed_content?: string | null
          program_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "uploaded_files_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "uploaded_files_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_program_memberships: {
        Row: {
          created_at: string
          id: string
          program_id: string
          role: Database["public"]["Enums"]["program_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          role: Database["public"]["Enums"]["program_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          role?: Database["public"]["Enums"]["program_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_program_memberships_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_view_patient_consent: {
        Args: { _subject_external_id: string; _user_id: string }
        Returns: boolean
      }
      derive_classification: {
        Args: { _program_id: string }
        Returns: Database["public"]["Enums"]["data_classification"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_program_member: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
      data_classification: "standard_phi" | "part2_protected"
      program_role: "treating_provider" | "care_team" | "program_admin"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      data_classification: ["standard_phi", "part2_protected"],
      program_role: ["treating_provider", "care_team", "program_admin"],
    },
  },
} as const
