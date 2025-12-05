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
          gender: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          birth_year?: number | null
          created_at?: string
          display_name?: string | null
          gender?: string | null
          id?: string
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
          id: string
          level: number
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
          id?: string
          level?: number
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
          id?: string
          level?: number
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
          experience_level?: string
          goal?: string
          id?: string
          name?: string
          program_data?: Json
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      complete_pool_challenges: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
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
    },
  },
} as const
