export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      jobs: {
        Row: {
          id: string
          title: string
          description: string
          requirements: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          description: string
          requirements?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          description?: string
          requirements?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      candidates: {
        Row: {
          id: string
          name: string
          email: string | null
          status: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          email?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          email?: string | null
          status?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      documents: {
        Row: {
          id: string
          candidate_id: string
          type: string
          content: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          type: string
          content?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          type?: string
          content?: string | null
          created_at?: string | null
        }
      }
      candidate_profiles: {
        Row: {
          id: string
          candidate_id: string
          summary: string | null
          skills: Json | null
          education: Json | null
          experience: Json | null
          projects: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          summary?: string | null
          skills?: Json | null
          education?: Json | null
          experience?: Json | null
          projects?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          summary?: string | null
          skills?: Json | null
          education?: Json | null
          experience?: Json | null
          projects?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      evidence: {
        Row: {
          id: string
          profile_id: string
          source_document_id: string | null
          claim: string
          strength: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          profile_id: string
          source_document_id?: string | null
          claim: string
          strength?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          profile_id?: string
          source_document_id?: string | null
          claim?: string
          strength?: string | null
          created_at?: string | null
        }
      }
      agent_analyses: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          agent_type: string
          analysis_content: Json | null
          strengths: Json | null
          risks: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          job_id: string
          agent_type: string
          analysis_content?: Json | null
          strengths?: Json | null
          risks?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          job_id?: string
          agent_type?: string
          analysis_content?: Json | null
          strengths?: Json | null
          risks?: Json | null
          created_at?: string | null
        }
      }
      debate_messages: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          agent_type: string
          message: string
          responds_to_message_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          job_id: string
          agent_type: string
          message: string
          responds_to_message_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          job_id?: string
          agent_type?: string
          message?: string
          responds_to_message_id?: string | null
          created_at?: string | null
        }
      }
      opinion_changes: {
        Row: {
          id: string
          debate_message_id: string
          agent_type: string
          previous_opinion: string | null
          new_opinion: string | null
          reason: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          debate_message_id: string
          agent_type: string
          previous_opinion?: string | null
          new_opinion?: string | null
          reason?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          debate_message_id?: string
          agent_type?: string
          previous_opinion?: string | null
          new_opinion?: string | null
          reason?: string | null
          created_at?: string | null
        }
      }
      final_decisions: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          recommendation: string
          confidence_score: number | null
          reasoning: Json | null
          strengths: Json | null
          risks: Json | null
          decisive_evidence: Json | null
          unresolved_questions: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          job_id: string
          recommendation: string
          confidence_score?: number | null
          reasoning?: Json | null
          strengths?: Json | null
          risks?: Json | null
          decisive_evidence?: Json | null
          unresolved_questions?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          job_id?: string
          recommendation?: string
          confidence_score?: number | null
          reasoning?: Json | null
          strengths?: Json | null
          risks?: Json | null
          decisive_evidence?: Json | null
          unresolved_questions?: Json | null
          created_at?: string | null
        }
      }
      candidate_comparisons: {
        Row: {
          id: string
          candidate_id: string
          job_id: string
          match_score: number | null
          requirements_match: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          candidate_id: string
          job_id: string
          match_score?: number | null
          requirements_match?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          candidate_id?: string
          job_id?: string
          match_score?: number | null
          requirements_match?: Json | null
          created_at?: string | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
