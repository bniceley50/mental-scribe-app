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
          hash: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          part2_disclosure_purpose: string | null
          pii_redacted: boolean | null
          prev_hash: string | null
          program_id: string | null
          purpose: string | null
          redaction_count: number | null
          resource_id: string | null
          resource_type: string
          secret_version: number
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          consent_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          hash?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          part2_disclosure_purpose?: string | null
          pii_redacted?: boolean | null
          prev_hash?: string | null
          program_id?: string | null
          purpose?: string | null
          redaction_count?: number | null
          resource_id?: string | null
          resource_type: string
          secret_version?: number
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          consent_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          hash?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          part2_disclosure_purpose?: string | null
          pii_redacted?: boolean | null
          prev_hash?: string | null
          program_id?: string | null
          purpose?: string | null
          redaction_count?: number | null
          resource_id?: string | null
          resource_type?: string
          secret_version?: number
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
      audit_verify_runs: {
        Row: {
          broken_at_id: string | null
          details: Json | null
          id: number
          intact: boolean
          run_at: string
          total_entries: number
          verified_entries: number
        }
        Insert: {
          broken_at_id?: string | null
          details?: Json | null
          id?: number
          intact: boolean
          run_at?: string
          total_entries: number
          verified_entries: number
        }
        Update: {
          broken_at_id?: string | null
          details?: Json | null
          id?: number
          intact?: boolean
          run_at?: string
          total_entries?: number
          verified_entries?: number
        }
        Relationships: []
      }
      client_access_logs: {
        Row: {
          access_method: string
          access_type: string
          accessed_by: string
          client_id: string
          created_at: string
          id: string
          program_id: string | null
        }
        Insert: {
          access_method: string
          access_type: string
          accessed_by: string
          client_id: string
          created_at?: string
          id?: string
          program_id?: string | null
        }
        Update: {
          access_method?: string
          access_type?: string
          accessed_by?: string
          client_id?: string
          created_at?: string
          id?: string
          program_id?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          created_at: string
          data_classification: Database["public"]["Enums"]["data_classification"]
          date_of_birth: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          emergency_contact_relationship: string | null
          external_id: string | null
          first_name: string
          gender: string | null
          id: string
          insurance_id: string | null
          insurance_provider: string | null
          is_active: boolean
          last_name: string
          phone: string | null
          preferred_name: string | null
          primary_diagnosis: string | null
          program_id: string | null
          pronouns: string | null
          secondary_diagnoses: string[] | null
          treatment_goals: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          external_id?: string | null
          first_name: string
          gender?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name: string
          phone?: string | null
          preferred_name?: string | null
          primary_diagnosis?: string | null
          program_id?: string | null
          pronouns?: string | null
          secondary_diagnoses?: string[] | null
          treatment_goals?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          date_of_birth?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          emergency_contact_relationship?: string | null
          external_id?: string | null
          first_name?: string
          gender?: string | null
          id?: string
          insurance_id?: string | null
          insurance_provider?: string | null
          is_active?: boolean
          last_name?: string
          phone?: string | null
          preferred_name?: string | null
          primary_diagnosis?: string | null
          program_id?: string | null
          pronouns?: string | null
          secondary_diagnoses?: string[] | null
          treatment_goals?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_program_id_fkey"
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
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "conversations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      failed_login_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          id: string
          ip_address: string
          user_id: string | null
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address: string
          user_id?: string | null
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          user_id?: string | null
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
      mfa_recovery_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          salt: string | null
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          salt?: string | null
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          salt?: string | null
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
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
      password_history: {
        Row: {
          created_at: string
          id: string
          password_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          password_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          password_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      patient_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          client_id: string
          created_at: string
          id: string
          revoked_at: string | null
          staff_user_id: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          client_id: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          staff_user_id: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          client_id?: string
          created_at?: string
          id?: string
          revoked_at?: string | null
          staff_user_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      rate_limit_configs: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          max_requests: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          max_requests?: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          max_requests?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          created_at: string
          endpoint: string
          id: string
          ip_address: string | null
          request_count: number
          updated_at: string
          user_id: string | null
          window_start: string
        }
        Insert: {
          created_at?: string
          endpoint: string
          id?: string
          ip_address?: string | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Update: {
          created_at?: string
          endpoint?: string
          id?: string
          ip_address?: string | null
          request_count?: number
          updated_at?: string
          user_id?: string | null
          window_start?: string
        }
        Relationships: []
      }
      recordings: {
        Row: {
          chunks_completed: number | null
          chunks_total: number | null
          client_id: string | null
          conversation_id: string | null
          created_at: string
          data_classification: Database["public"]["Enums"]["data_classification"]
          duration_seconds: number | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          processing_error: string | null
          processing_status:
            | Database["public"]["Enums"]["audio_processing_status"]
            | null
          program_id: string | null
          resume_token: string | null
          transcription_status: string | null
          transcription_text: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          chunks_completed?: number | null
          chunks_total?: number | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          duration_seconds?: number | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["audio_processing_status"]
            | null
          program_id?: string | null
          resume_token?: string | null
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          chunks_completed?: number | null
          chunks_total?: number | null
          client_id?: string | null
          conversation_id?: string | null
          created_at?: string
          data_classification?: Database["public"]["Enums"]["data_classification"]
          duration_seconds?: number | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          processing_error?: string | null
          processing_status?:
            | Database["public"]["Enums"]["audio_processing_status"]
            | null
          program_id?: string | null
          resume_token?: string | null
          transcription_status?: string | null
          transcription_text?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recordings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recordings_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      security_fixes: {
        Row: {
          finding: string
          fix_date: string
          id: string
          remediation: string
          severity: string
          verification_date: string | null
          verified_by: string | null
        }
        Insert: {
          finding: string
          fix_date?: string
          id?: string
          remediation: string
          severity: string
          verification_date?: string | null
          verified_by?: string | null
        }
        Update: {
          finding?: string
          fix_date?: string
          id?: string
          remediation?: string
          severity?: string
          verification_date?: string | null
          verified_by?: string | null
        }
        Relationships: []
      }
      structured_notes: {
        Row: {
          client_id: string | null
          client_perspective: string | null
          clinical_impression: string | null
          content_json: Json | null
          conversation_id: string
          created_at: string
          current_status: string | null
          data_classification: Database["public"]["Enums"]["data_classification"]
          differential_diagnosis: Json | null
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
          client_id?: string | null
          client_perspective?: string | null
          clinical_impression?: string | null
          content_json?: Json | null
          conversation_id: string
          created_at?: string
          current_status?: string | null
          data_classification?: Database["public"]["Enums"]["data_classification"]
          differential_diagnosis?: Json | null
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
          client_id?: string | null
          client_perspective?: string | null
          clinical_impression?: string | null
          content_json?: Json | null
          conversation_id?: string
          created_at?: string
          current_status?: string | null
          data_classification?: Database["public"]["Enums"]["data_classification"]
          differential_diagnosis?: Json | null
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
            foreignKeyName: "structured_notes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      tenant_quotas: {
        Row: {
          created_at: string
          current_usage: number | null
          id: string
          limit_value: number
          quota_type: string
          reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_usage?: number | null
          id?: string
          limit_value: number
          quota_type: string
          reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_usage?: number | null
          id?: string
          limit_value?: number
          quota_type?: string
          reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      uploaded_files: {
        Row: {
          client_id: string | null
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
          client_id?: string | null
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
          client_id?: string | null
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
            foreignKeyName: "uploaded_files_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
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
      user_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip_address: string | null
          last_activity_at: string
          salt: string
          session_token: string
          token_hash: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          salt: string
          session_token: string
          token_hash: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip_address?: string | null
          last_activity_at?: string
          salt?: string
          session_token?: string
          token_hash?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      mv_audit_daily_stats: {
        Row: {
          action_types: number | null
          day: string | null
          resource_types: number | null
          total_entries: number | null
          unique_users: number | null
        }
        Relationships: []
      }
      performance_index_usage: {
        Row: {
          index_name: unknown
          scans: number | null
          schemaname: unknown
          size: string | null
          table_name: unknown
          tuples_fetched: number | null
          tuples_read: number | null
        }
        Relationships: []
      }
      performance_table_bloat: {
        Row: {
          dead_tuples: number | null
          last_autovacuum: string | null
          last_vacuum: string | null
          live_tuples: number | null
          pct_dead: number | null
          schemaname: unknown
          table_name: unknown
          total_size: string | null
        }
        Relationships: []
      }
      user_sessions_safe: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          ip_address: string | null
          last_activity_at: string | null
          status: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: string | null
          last_activity_at?: string | null
          status?: never
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          ip_address?: string | null
          last_activity_at?: string | null
          status?: never
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      add_password_to_history: {
        Args: { _password_hash: string; _user_id: string }
        Returns: undefined
      }
      can_view_patient_consent: {
        Args: { _subject_external_id: string; _user_id: string }
        Returns: boolean
      }
      check_and_increment_quota: {
        Args: { _increment?: number; _quota_type: string; _user_id: string }
        Returns: boolean
      }
      check_password_history: {
        Args: {
          _history_limit?: number
          _new_password_hash: string
          _user_id: string
        }
        Returns: boolean
      }
      check_rate_limit: {
        Args: {
          _endpoint: string
          _max_requests?: number
          _user_id: string
          _window_minutes?: number
        }
        Returns: boolean
      }
      check_signup_rate_limit: {
        Args: {
          _ip_address: string
          _max_requests?: number
          _window_minutes?: number
        }
        Returns: boolean
      }
      cleanup_expired_sessions: { Args: never; Returns: undefined }
      cleanup_old_failed_logins: { Args: never; Returns: undefined }
      cleanup_old_password_history: { Args: never; Returns: undefined }
      cleanup_old_rate_limits: { Args: never; Returns: undefined }
      clear_failed_logins: { Args: { _identifier: string }; Returns: undefined }
      derive_classification: {
        Args: { _program_id: string }
        Returns: Database["public"]["Enums"]["data_classification"]
      }
      generate_salt: { Args: never; Returns: string }
      get_suspicious_access_patterns: {
        Args: { _access_threshold?: number; _hours_lookback?: number }
        Returns: {
          access_count: number
          access_methods: Json
          access_types: Json
          accessed_by: string
          unique_clients: number
        }[]
      }
      has_active_part2_consent: {
        Args: { _conversation_id: string; _user_id: string }
        Returns: boolean
      }
      has_active_part2_consent_for_conversation: {
        Args: { _conversation_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      hash_external_id: { Args: { raw_id: string }; Returns: string }
      hash_recovery_code: {
        Args: { code: string; salt: string }
        Returns: string
      }
      hash_session_token: {
        Args: { salt: string; token: string }
        Returns: string
      }
      invalidate_user_sessions: {
        Args: { _user_id: string }
        Returns: undefined
      }
      is_account_locked: {
        Args: { _identifier: string; _lockout_minutes?: number }
        Returns: boolean
      }
      is_assigned_to_patient: {
        Args: { _client_id: string; _user_id: string }
        Returns: boolean
      }
      is_clinical_staff: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      is_program_member: {
        Args: { _program_id: string; _user_id: string }
        Returns: boolean
      }
      log_client_view: {
        Args: { _access_method?: string; _client_id: string }
        Returns: undefined
      }
      record_failed_login: {
        Args: { _email: string; _ip_address: string; _user_id: string }
        Returns: undefined
      }
      sanitize_audit_metadata: { Args: { meta: Json }; Returns: Json }
      update_session_activity: {
        Args: { _session_token: string }
        Returns: undefined
      }
      validate_session_token: {
        Args: { _session_token: string; _user_id?: string }
        Returns: {
          expires_at: string
          is_valid: boolean
          session_id: string
          user_id: string
        }[]
      }
      verify_audit_chain: {
        Args: never
        Returns: {
          actual: string
          broken_at_id: string
          expected: string
          intact: boolean
          total_entries: number
          verified_entries: number
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      audio_processing_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "chunking"
        | "assembling"
      consent_status: "active" | "revoked" | "expired"
      data_classification: "standard_phi" | "part2_protected"
      disclosure_purpose_type:
        | "treatment"
        | "payment"
        | "legal"
        | "research"
        | "patient_request"
        | "emergency"
        | "other"
      part2_consent_type:
        | "treatment"
        | "payment"
        | "healthcare_operations"
        | "research"
        | "legal"
        | "other"
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
      audio_processing_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "chunking",
        "assembling",
      ],
      consent_status: ["active", "revoked", "expired"],
      data_classification: ["standard_phi", "part2_protected"],
      disclosure_purpose_type: [
        "treatment",
        "payment",
        "legal",
        "research",
        "patient_request",
        "emergency",
        "other",
      ],
      part2_consent_type: [
        "treatment",
        "payment",
        "healthcare_operations",
        "research",
        "legal",
        "other",
      ],
      program_role: ["treating_provider", "care_team", "program_admin"],
    },
  },
} as const
