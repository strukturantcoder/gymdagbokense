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
      achievements: {
        Row: {
          description: string
          icon: string
          id: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward: number
        }
        Insert: {
          description: string
          icon: string
          id?: string
          name: string
          requirement_type: string
          requirement_value: number
          xp_reward?: number
        }
        Update: {
          description?: string
          icon?: string
          id?: string
          name?: string
          requirement_type?: string
          requirement_value?: number
          xp_reward?: number
        }
        Relationships: []
      }
      ad_stats: {
        Row: {
          ad_id: string
          created_at: string
          event_type: string
          id: string
          user_id: string | null
        }
        Insert: {
          ad_id: string
          created_at?: string
          event_type: string
          id?: string
          user_id?: string | null
        }
        Update: {
          ad_id?: string
          created_at?: string
          event_type?: string
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ad_stats_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ad_statistics"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_stats_ad_id_fkey"
            columns: ["ad_id"]
            isOneToOne: false
            referencedRelation: "ads"
            referencedColumns: ["id"]
          },
        ]
      }
      ads: {
        Row: {
          alt_text: string | null
          created_at: string
          format: string
          id: string
          image_url: string
          is_active: boolean
          link: string
          name: string
          placement: string | null
          updated_at: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          format?: string
          id?: string
          image_url: string
          is_active?: boolean
          link: string
          name: string
          placement?: string | null
          updated_at?: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          format?: string
          id?: string
          image_url?: string
          is_active?: boolean
          link?: string
          name?: string
          placement?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cardio_goals: {
        Row: {
          activity_type: string
          created_at: string
          id: string
          period: string
          target_type: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          activity_type: string
          created_at?: string
          id?: string
          period?: string
          target_type: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          activity_type?: string
          created_at?: string
          id?: string
          period?: string
          target_type?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      cardio_logs: {
        Row: {
          activity_type: string
          calories_burned: number | null
          completed_at: string
          created_at: string
          distance_km: number | null
          duration_minutes: number
          id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          activity_type: string
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          distance_km?: number | null
          duration_minutes: number
          id?: string
          notes?: string | null
          user_id: string
        }
        Update: {
          activity_type?: string
          calories_burned?: number | null
          completed_at?: string
          created_at?: string
          distance_km?: number | null
          duration_minutes?: number
          id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: []
      }
      cardio_plan_sessions: {
        Row: {
          cardio_log_id: string | null
          completed_at: string
          id: string
          plan_id: string
          session_day: string
          user_id: string
          week_number: number
        }
        Insert: {
          cardio_log_id?: string | null
          completed_at?: string
          id?: string
          plan_id: string
          session_day: string
          user_id: string
          week_number: number
        }
        Update: {
          cardio_log_id?: string | null
          completed_at?: string
          id?: string
          plan_id?: string
          session_day?: string
          user_id?: string
          week_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "cardio_plan_sessions_cardio_log_id_fkey"
            columns: ["cardio_log_id"]
            isOneToOne: false
            referencedRelation: "cardio_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cardio_plan_sessions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "cardio_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      cardio_plans: {
        Row: {
          created_at: string
          description: string | null
          goal_type: string
          id: string
          is_active: boolean
          name: string
          plan_data: Json
          target_value: string | null
          total_weeks: number
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          goal_type: string
          id?: string
          is_active?: boolean
          name: string
          plan_data: Json
          target_value?: string | null
          total_weeks: number
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          goal_type?: string
          id?: string
          is_active?: boolean
          name?: string
          plan_data?: Json
          target_value?: string | null
          total_weeks?: number
          user_id?: string
        }
        Relationships: []
      }
      cardio_routes: {
        Row: {
          average_speed_kmh: number
          cardio_log_id: string
          created_at: string
          id: string
          max_speed_kmh: number
          route_data: Json
          total_distance_km: number
          user_id: string
        }
        Insert: {
          average_speed_kmh?: number
          cardio_log_id: string
          created_at?: string
          id?: string
          max_speed_kmh?: number
          route_data: Json
          total_distance_km?: number
          user_id: string
        }
        Update: {
          average_speed_kmh?: number
          cardio_log_id?: string
          created_at?: string
          id?: string
          max_speed_kmh?: number
          route_data?: Json
          total_distance_km?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cardio_routes_cardio_log_id_fkey"
            columns: ["cardio_log_id"]
            isOneToOne: false
            referencedRelation: "cardio_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_pool_entries: {
        Row: {
          allow_multiple: boolean
          challenge_category: string
          challenge_type: string
          created_at: string
          duration_days: number
          id: string
          latest_start_date: string
          max_age: number | null
          max_participants: number | null
          min_age: number | null
          preferred_gender: string | null
          status: string
          target_value: number
          updated_at: string
          user_id: string
        }
        Insert: {
          allow_multiple?: boolean
          challenge_category: string
          challenge_type: string
          created_at?: string
          duration_days: number
          id?: string
          latest_start_date: string
          max_age?: number | null
          max_participants?: number | null
          min_age?: number | null
          preferred_gender?: string | null
          status?: string
          target_value: number
          updated_at?: string
          user_id: string
        }
        Update: {
          allow_multiple?: boolean
          challenge_category?: string
          challenge_type?: string
          created_at?: string
          duration_days?: number
          id?: string
          latest_start_date?: string
          max_age?: number | null
          max_participants?: number | null
          min_age?: number | null
          preferred_gender?: string | null
          status?: string
          target_value?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          current_value: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_value?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          challenged_id: string
          challenger_id: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          target_value: number
          winner_id: string | null
        }
        Insert: {
          challenge_type: Database["public"]["Enums"]["challenge_type"]
          challenged_id: string
          challenger_id: string
          created_at?: string
          end_date: string
          id?: string
          start_date: string
          status?: string
          target_value: number
          winner_id?: string | null
        }
        Update: {
          challenge_type?: Database["public"]["Enums"]["challenge_type"]
          challenged_id?: string
          challenger_id?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          winner_id?: string | null
        }
        Relationships: []
      }
      community_challenge_participants: {
        Row: {
          challenge_id: string
          current_value: number
          id: string
          joined_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_value?: number
          id?: string
          joined_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_value?: number
          id?: string
          joined_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "community_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "community_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      community_challenges: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          end_date: string
          goal_description: string
          goal_unit: string
          id: string
          is_active: boolean
          start_date: string
          target_value: number | null
          theme: string | null
          title: string
          winner_type: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date: string
          goal_description: string
          goal_unit: string
          id?: string
          is_active?: boolean
          start_date: string
          target_value?: number | null
          theme?: string | null
          title: string
          winner_type?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          end_date?: string
          goal_description?: string
          goal_unit?: string
          id?: string
          is_active?: boolean
          start_date?: string
          target_value?: number | null
          theme?: string | null
          title?: string
          winner_type?: string
        }
        Relationships: []
      }
      contact_messages: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          subject: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string
          email: string
          email_type: string
          error_message: string | null
          id: string
          status: string
          subject: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email: string
          email_type: string
          error_message?: string | null
          id?: string
          status?: string
          subject: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          email_type?: string
          error_message?: string | null
          id?: string
          status?: string
          subject?: string
          user_id?: string | null
        }
        Relationships: []
      }
      exercise_goals: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          target_reps: number | null
          target_weight_kg: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          target_reps?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          target_reps?: number | null
          target_weight_kg?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      exercise_logs: {
        Row: {
          created_at: string
          exercise_name: string
          id: string
          notes: string | null
          reps_completed: string
          set_details: Json | null
          sets_completed: number
          weight_kg: number | null
          workout_log_id: string
        }
        Insert: {
          created_at?: string
          exercise_name: string
          id?: string
          notes?: string | null
          reps_completed: string
          set_details?: Json | null
          sets_completed: number
          weight_kg?: number | null
          workout_log_id: string
        }
        Update: {
          created_at?: string
          exercise_name?: string
          id?: string
          notes?: string | null
          reps_completed?: string
          set_details?: Json | null
          sets_completed?: number
          weight_kg?: number | null
          workout_log_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_logs_workout_log_id_fkey"
            columns: ["workout_log_id"]
            isOneToOne: false
            referencedRelation: "workout_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          created_at: string
          friend_id: string
          id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          friend_id: string
          id?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          friend_id?: string
          id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          achievements: boolean
          challenges: boolean
          community_challenges: boolean
          created_at: string
          friend_requests: boolean
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
          weekly_summary_emails: boolean
          workout_reminders: boolean
        }
        Insert: {
          achievements?: boolean
          challenges?: boolean
          community_challenges?: boolean
          created_at?: string
          friend_requests?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
          weekly_summary_emails?: boolean
          workout_reminders?: boolean
        }
        Update: {
          achievements?: boolean
          challenges?: boolean
          community_challenges?: boolean
          created_at?: string
          friend_requests?: boolean
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
          weekly_summary_emails?: boolean
          workout_reminders?: boolean
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_bests: {
        Row: {
          achieved_at: string
          best_reps: number | null
          best_weight_kg: number
          exercise_name: string
          id: string
          user_id: string
        }
        Insert: {
          achieved_at?: string
          best_reps?: number | null
          best_weight_kg: number
          exercise_name: string
          id?: string
          user_id: string
        }
        Update: {
          achieved_at?: string
          best_reps?: number | null
          best_weight_kg?: number
          exercise_name?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      pool_challenge_messages: {
        Row: {
          challenge_id: string
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_challenge_messages_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "pool_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_challenge_participants: {
        Row: {
          challenge_id: string
          current_value: number
          id: string
          joined_at: string
          pool_entry_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          current_value?: number
          id?: string
          joined_at?: string
          pool_entry_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          current_value?: number
          id?: string
          joined_at?: string
          pool_entry_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pool_challenge_participants_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "pool_challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pool_challenge_participants_pool_entry_id_fkey"
            columns: ["pool_entry_id"]
            isOneToOne: false
            referencedRelation: "challenge_pool_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      pool_challenges: {
        Row: {
          challenge_category: string
          challenge_type: string
          created_at: string
          end_date: string
          id: string
          start_date: string
          status: string
          target_value: number
          winner_id: string | null
          xp_reward: number
        }
        Insert: {
          challenge_category: string
          challenge_type: string
          created_at?: string
          end_date: string
          id?: string
          start_date?: string
          status?: string
          target_value: number
          winner_id?: string | null
          xp_reward?: number
        }
        Update: {
          challenge_category?: string
          challenge_type?: string
          created_at?: string
          end_date?: string
          id?: string
          start_date?: string
          status?: string
          target_value?: number
          winner_id?: string | null
          xp_reward?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          birth_year: number | null
          created_at: string
          display_name: string | null
          facebook_url: string | null
          gender: string | null
          id: string
          instagram_username: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          facebook_url?: string | null
          gender?: string | null
          id?: string
          instagram_username?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          facebook_url?: string | null
          gender?: string | null
          id?: string
          instagram_username?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          invite_code: string
          invited_id: string
          inviter_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invite_code: string
          invited_id: string
          inviter_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invite_code?: string
          invited_id?: string
          inviter_id?: string
        }
        Relationships: []
      }
      reminder_logs: {
        Row: {
          id: string
          reminder_date: string
          reminder_type: string
          sent_at: string
          user_id: string
        }
        Insert: {
          id?: string
          reminder_date: string
          reminder_type: string
          sent_at?: string
          user_id: string
        }
        Update: {
          id?: string
          reminder_date?: string
          reminder_type?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_wods: {
        Row: {
          created_at: string
          description: string | null
          duration: string
          exercises: Json
          format: string
          id: string
          name: string
          scaling: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          duration: string
          exercises: Json
          format: string
          id?: string
          name: string
          scaling?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          duration?: string
          exercises?: Json
          format?: string
          id?: string
          name?: string
          scaling?: string | null
          user_id?: string
        }
        Relationships: []
      }
      scheduled_emails: {
        Row: {
          content: string
          created_at: string
          created_by: string | null
          id: string
          scheduled_for: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          template: string | null
        }
        Insert: {
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          template?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          scheduled_for?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          template?: string | null
        }
        Relationships: []
      }
      scheduled_workouts: {
        Row: {
          completed_at: string | null
          created_at: string
          description: string | null
          duration_minutes: number | null
          id: string
          reminder_enabled: boolean | null
          reminder_minutes_before: number | null
          scheduled_date: string
          scheduled_time: string | null
          title: string
          updated_at: string
          user_id: string
          workout_day_name: string | null
          workout_program_id: string | null
          workout_type: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          scheduled_date: string
          scheduled_time?: string | null
          title: string
          updated_at?: string
          user_id: string
          workout_day_name?: string | null
          workout_program_id?: string | null
          workout_type?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number | null
          id?: string
          reminder_enabled?: boolean | null
          reminder_minutes_before?: number | null
          scheduled_date?: string
          scheduled_time?: string | null
          title?: string
          updated_at?: string
          user_id?: string
          workout_day_name?: string | null
          workout_program_id?: string | null
          workout_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_workouts_workout_program_id_fkey"
            columns: ["workout_program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invitations: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          invited_user_id: string
          status: string
          team_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          invited_user_id: string
          status?: string
          team_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          invited_user_id?: string
          status?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_invite_links: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          team_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          team_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          team_id?: string
          uses_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "team_invite_links_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          id: string
          invited_by: string | null
          joined_at: string
          role: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Insert: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id: string
          user_id: string
        }
        Update: {
          id?: string
          invited_by?: string | null
          joined_at?: string
          role?: Database["public"]["Enums"]["team_role"]
          team_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          avatar_url: string | null
          created_at: string
          description: string | null
          id: string
          leader_id: string
          name: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id: string
          name: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          leader_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
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
      user_stats: {
        Row: {
          created_at: string
          current_streak: number
          daily_bonus_claimed_at: string | null
          id: string
          last_activity_date: string | null
          level: number
          longest_streak: number
          total_cardio_distance_km: number
          total_cardio_minutes: number
          total_cardio_sessions: number
          total_minutes: number
          total_sets: number
          total_workouts: number
          total_xp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_streak?: number
          daily_bonus_claimed_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_cardio_distance_km?: number
          total_cardio_minutes?: number
          total_cardio_sessions?: number
          total_minutes?: number
          total_sets?: number
          total_workouts?: number
          total_xp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_streak?: number
          daily_bonus_claimed_at?: string | null
          id?: string
          last_activity_date?: string | null
          level?: number
          longest_streak?: number
          total_cardio_distance_km?: number
          total_cardio_minutes?: number
          total_cardio_sessions?: number
          total_minutes?: number
          total_sets?: number
          total_workouts?: number
          total_xp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wod_logs: {
        Row: {
          completed_at: string
          completion_time: string | null
          created_at: string
          id: string
          notes: string | null
          reps_completed: number | null
          rounds_completed: number | null
          user_id: string
          wod_duration: string
          wod_exercises: Json
          wod_format: string
          wod_name: string
        }
        Insert: {
          completed_at?: string
          completion_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rounds_completed?: number | null
          user_id: string
          wod_duration: string
          wod_exercises: Json
          wod_format: string
          wod_name: string
        }
        Update: {
          completed_at?: string
          completion_time?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          reps_completed?: number | null
          rounds_completed?: number | null
          user_id?: string
          wod_duration?: string
          wod_exercises?: Json
          wod_format?: string
          wod_name?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          completed_at: string
          created_at: string
          duration_minutes: number | null
          id: string
          notes: string | null
          program_id: string | null
          user_id: string
          workout_day: string
        }
        Insert: {
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          program_id?: string | null
          user_id: string
          workout_day: string
        }
        Update: {
          completed_at?: string
          created_at?: string
          duration_minutes?: number | null
          id?: string
          notes?: string | null
          program_id?: string | null
          user_id?: string
          workout_day?: string
        }
        Relationships: [
          {
            foreignKeyName: "workout_logs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "workout_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_programs: {
        Row: {
          created_at: string
          days_per_week: number
          deleted_at: string | null
          experience_level: string
          goal: string
          id: string
          name: string
          program_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string
          days_per_week: number
          deleted_at?: string | null
          experience_level: string
          goal: string
          id?: string
          name: string
          program_data: Json
          user_id: string
        }
        Update: {
          created_at?: string
          days_per_week?: number
          deleted_at?: string | null
          experience_level?: string
          goal?: string
          id?: string
          name?: string
          program_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      workout_reminders: {
        Row: {
          created_at: string
          days_of_week: number[]
          id: string
          is_enabled: boolean
          minutes_before: number | null
          reminder_time: string
          reminder_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_enabled?: boolean
          minutes_before?: number | null
          reminder_time?: string
          reminder_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_of_week?: number[]
          id?: string
          is_enabled?: boolean
          minutes_before?: number | null
          reminder_time?: string
          reminder_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      ad_statistics: {
        Row: {
          clicks: number | null
          ctr: number | null
          format: string | null
          id: string | null
          impressions: number | null
          is_active: boolean | null
          name: string | null
          placement: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      abbreviate_name: { Args: { full_name: string }; Returns: string }
      claim_daily_bonus: {
        Args: { p_user_id: string }
        Returns: {
          is_new_day: boolean
          new_streak: number
          xp_earned: number
        }[]
      }
      complete_friend_challenges: { Args: never; Returns: undefined }
      complete_pool_challenges: { Args: never; Returns: undefined }
      get_friend_profile: {
        Args: { friend_user_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      get_friend_stats: {
        Args: { friend_user_id: string }
        Returns: {
          level: number
          total_workouts: number
          total_xp: number
          user_id: string
        }[]
      }
      get_pool_challenge_participants: {
        Args: { challenge_uuid: string }
        Returns: {
          avatar_url: string
          current_value: number
          display_name: string
          participant_id: string
          user_id: string
        }[]
      }
      get_public_community_challenges: {
        Args: never
        Returns: {
          created_at: string
          description: string
          end_date: string
          goal_description: string
          goal_unit: string
          id: string
          is_active: boolean
          start_date: string
          target_value: number
          theme: string
          title: string
          winner_type: string
        }[]
      }
      get_streak_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          current_streak: number
          display_name: string
          longest_streak: number
          user_id: string
        }[]
      }
      get_team_by_invite_code: {
        Args: { invite_code: string }
        Returns: {
          is_valid: boolean
          member_count: number
          team_description: string
          team_id: string
          team_name: string
        }[]
      }
      get_team_competition_leaderboard: {
        Args: { limit_count?: number }
        Returns: {
          avatar_url: string
          invited_joined_count: number
          leader_id: string
          leader_name: string
          member_count: number
          team_id: string
          team_name: string
          total_xp: number
        }[]
      }
      get_team_stats: {
        Args: { team_uuid: string }
        Returns: {
          invited_count: number
          total_members: number
          total_workouts: number
          total_xp: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      join_team_via_invite_link: {
        Args: { invite_code: string }
        Returns: Json
      }
      search_users_by_name: {
        Args: { search_query: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
        }[]
      }
      validate_invite_code: {
        Args: { code_to_check: string }
        Returns: {
          inviter_id: string
          is_valid: boolean
        }[]
      }
    }
    Enums: {
      app_role: "admin" | "user"
      challenge_type: "workouts" | "sets" | "minutes"
      team_role: "leader" | "admin" | "member"
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
      challenge_type: ["workouts", "sets", "minutes"],
      team_role: ["leader", "admin", "member"],
    },
  },
} as const
