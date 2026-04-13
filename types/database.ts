// FocusHub Database Types
// TypeScript types matching the Supabase schema

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
      profiles: {
        Row: {
          id: string
          email: string | null
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          role: 'user' | 'admin' | 'moderator'
          timezone: string
          total_focus_time: number
          total_sessions: number
          current_streak: number
          longest_streak: number
          level: number
          xp: number
          settings: ProfileSettings
          created_at: string
          updated_at: string
          last_active_at: string
        }
        Insert: {
          id: string
          email?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'moderator'
          timezone?: string
          total_focus_time?: number
          total_sessions?: number
          current_streak?: number
          longest_streak?: number
          level?: number
          xp?: number
          settings?: ProfileSettings
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          email?: string | null
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          role?: 'user' | 'admin' | 'moderator'
          timezone?: string
          total_focus_time?: number
          total_sessions?: number
          current_streak?: number
          longest_streak?: number
          level?: number
          xp?: number
          settings?: ProfileSettings
          created_at?: string
          updated_at?: string
          last_active_at?: string
        }
      }
      rooms: {
        Row: {
          id: string
          name: string
          description: string | null
          host_id: string
          category: RoomCategory
          is_private: boolean
          password_hash: string | null
          max_participants: number
          focus_duration: number
          break_duration: number
          is_timer_synced: boolean
          status: 'active' | 'archived' | 'scheduled'
          scheduled_start: string | null
          scheduled_end: string | null
          total_sessions: number
          total_focus_minutes: number
          tags: string[]
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          host_id: string
          category?: RoomCategory
          is_private?: boolean
          password_hash?: string | null
          max_participants?: number
          focus_duration?: number
          break_duration?: number
          is_timer_synced?: boolean
          status?: 'active' | 'archived' | 'scheduled'
          scheduled_start?: string | null
          scheduled_end?: string | null
          total_sessions?: number
          total_focus_minutes?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          host_id?: string
          category?: RoomCategory
          is_private?: boolean
          password_hash?: string | null
          max_participants?: number
          focus_duration?: number
          break_duration?: number
          is_timer_synced?: boolean
          status?: 'active' | 'archived' | 'scheduled'
          scheduled_start?: string | null
          scheduled_end?: string | null
          total_sessions?: number
          total_focus_minutes?: number
          tags?: string[]
          created_at?: string
          updated_at?: string
        }
      }
      room_members: {
        Row: {
          id: string
          room_id: string
          user_id: string
          role: 'host' | 'moderator' | 'member'
          status: 'active' | 'idle' | 'focusing' | 'break' | 'offline'
          focus_time_in_room: number
          sessions_in_room: number
          joined_at: string
          last_active_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          role?: 'host' | 'moderator' | 'member'
          status?: 'active' | 'idle' | 'focusing' | 'break' | 'offline'
          focus_time_in_room?: number
          sessions_in_room?: number
          joined_at?: string
          last_active_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          role?: 'host' | 'moderator' | 'member'
          status?: 'active' | 'idle' | 'focusing' | 'break' | 'offline'
          focus_time_in_room?: number
          sessions_in_room?: number
          joined_at?: string
          last_active_at?: string
        }
      }
      room_messages: {
        Row: {
          id: string
          room_id: string
          user_id: string
          content: string
          message_type: 'text' | 'system' | 'achievement'
          reply_to_id: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id: string
          content: string
          message_type?: 'text' | 'system' | 'achievement'
          reply_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string
          content?: string
          message_type?: 'text' | 'system' | 'achievement'
          reply_to_id?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      focus_sessions: {
        Row: {
          id: string
          user_id: string
          room_id: string | null
          session_type: 'focus' | 'short_break' | 'long_break'
          planned_duration: number
          actual_duration: number | null
          status: 'active' | 'completed' | 'abandoned' | 'paused'
          task_name: string | null
          task_category: string | null
          was_interrupted: boolean
          interruption_count: number
          started_at: string
          ended_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          room_id?: string | null
          session_type?: 'focus' | 'short_break' | 'long_break'
          planned_duration: number
          actual_duration?: number | null
          status?: 'active' | 'completed' | 'abandoned' | 'paused'
          task_name?: string | null
          task_category?: string | null
          was_interrupted?: boolean
          interruption_count?: number
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string | null
          session_type?: 'focus' | 'short_break' | 'long_break'
          planned_duration?: number
          actual_duration?: number | null
          status?: 'active' | 'completed' | 'abandoned' | 'paused'
          task_name?: string | null
          task_category?: string | null
          was_interrupted?: boolean
          interruption_count?: number
          started_at?: string
          ended_at?: string | null
          created_at?: string
        }
      }
      daily_stats: {
        Row: {
          id: string
          user_id: string
          date: string
          focus_sessions: number
          completed_sessions: number
          abandoned_sessions: number
          total_focus_minutes: number
          total_break_minutes: number
          longest_session_minutes: number
          category_breakdown: Json
          maintained_streak: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          date: string
          focus_sessions?: number
          completed_sessions?: number
          abandoned_sessions?: number
          total_focus_minutes?: number
          total_break_minutes?: number
          longest_session_minutes?: number
          category_breakdown?: Json
          maintained_streak?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          date?: string
          focus_sessions?: number
          completed_sessions?: number
          abandoned_sessions?: number
          total_focus_minutes?: number
          total_break_minutes?: number
          longest_session_minutes?: number
          category_breakdown?: Json
          maintained_streak?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      weekly_goals: {
        Row: {
          id: string
          user_id: string
          week_start: string
          target_focus_hours: number
          target_sessions: number
          target_streak_days: number
          achieved_focus_hours: number
          achieved_sessions: number
          achieved_streak_days: number
          progress_percentage: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          week_start: string
          target_focus_hours?: number
          target_sessions?: number
          target_streak_days?: number
          achieved_focus_hours?: number
          achieved_sessions?: number
          achieved_streak_days?: number
          progress_percentage?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          week_start?: string
          target_focus_hours?: number
          target_sessions?: number
          target_streak_days?: number
          achieved_focus_hours?: number
          achieved_sessions?: number
          achieved_streak_days?: number
          progress_percentage?: number
          created_at?: string
          updated_at?: string
        }
      }
      achievements: {
        Row: {
          id: string
          name: string
          description: string
          icon: string
          category: 'general' | 'streak' | 'time' | 'social' | 'milestone' | 'special'
          rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
          xp_reward: number
          requirements: Json
          is_active: boolean
          display_order: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          icon: string
          category?: 'general' | 'streak' | 'time' | 'social' | 'milestone' | 'special'
          rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
          xp_reward?: number
          requirements?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          icon?: string
          category?: 'general' | 'streak' | 'time' | 'social' | 'milestone' | 'special'
          rarity?: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'
          xp_reward?: number
          requirements?: Json
          is_active?: boolean
          display_order?: number
          created_at?: string
        }
      }
      user_achievements: {
        Row: {
          id: string
          user_id: string
          achievement_id: string
          earned_at: string
          progress: Json
          is_notified: boolean
        }
        Insert: {
          id?: string
          user_id: string
          achievement_id: string
          earned_at?: string
          progress?: Json
          is_notified?: boolean
        }
        Update: {
          id?: string
          user_id?: string
          achievement_id?: string
          earned_at?: string
          progress?: Json
          is_notified?: boolean
        }
      }
      leaderboard_entries: {
        Row: {
          id: string
          user_id: string
          period_type: 'daily' | 'weekly' | 'monthly' | 'all_time'
          period_start: string
          total_focus_minutes: number
          total_sessions: number
          longest_streak: number
          xp_earned: number
          rank: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          period_type: 'daily' | 'weekly' | 'monthly' | 'all_time'
          period_start: string
          total_focus_minutes?: number
          total_sessions?: number
          longest_streak?: number
          xp_earned?: number
          rank?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          period_type?: 'daily' | 'weekly' | 'monthly' | 'all_time'
          period_start?: string
          total_focus_minutes?: number
          total_sessions?: number
          longest_streak?: number
          xp_earned?: number
          rank?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      friendships: {
        Row: {
          id: string
          user_id: string
          friend_id: string
          status: 'pending' | 'accepted' | 'blocked'
          initiated_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          friend_id: string
          status?: 'pending' | 'accepted' | 'blocked'
          initiated_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          friend_id?: string
          status?: 'pending' | 'accepted' | 'blocked'
          initiated_by?: string
          created_at?: string
          updated_at?: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          related_type: string | null
          related_id: string | null
          data: Json
          is_read: boolean
          created_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          title: string
          message: string
          related_type?: string | null
          related_id?: string | null
          data?: Json
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          title?: string
          message?: string
          related_type?: string | null
          related_id?: string | null
          data?: Json
          is_read?: boolean
          created_at?: string
          read_at?: string | null
        }
      }
      activity_feed: {
        Row: {
          id: string
          user_id: string
          type: ActivityType
          description: string
          related_type: string | null
          related_id: string | null
          data: Json
          is_public: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: ActivityType
          description: string
          related_type?: string | null
          related_id?: string | null
          data?: Json
          is_public?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: ActivityType
          description?: string
          related_type?: string | null
          related_id?: string | null
          data?: Json
          is_public?: boolean
          created_at?: string
        }
      }
      study_planner_items: {
        Row: {
          id: string
          user_id: string
          room_id: string | null
          title: string
          description: string | null
          due_date: string | null
          priority: 'low' | 'medium' | 'high'
          status: 'todo' | 'in_progress' | 'completed'
          estimated_minutes: number | null
          completed_at: string | null
          order_index: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          room_id?: string | null
          title: string
          description?: string | null
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'todo' | 'in_progress' | 'completed'
          estimated_minutes?: number | null
          completed_at?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          room_id?: string | null
          title?: string
          description?: string | null
          due_date?: string | null
          priority?: 'low' | 'medium' | 'high'
          status?: 'todo' | 'in_progress' | 'completed'
          estimated_minutes?: number | null
          completed_at?: string | null
          order_index?: number
          created_at?: string
          updated_at?: string
        }
      }
    }
    Functions: {
      is_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      get_platform_stats: {
        Args: Record<string, never>
        Returns: {
          total_users: number
          total_rooms: number
          total_sessions: number
          total_focus_minutes: number
          active_users_today: number
          new_users_today: number
          active_rooms: number
        }[]
      }
      get_user_growth: {
        Args: { days_back?: number }
        Returns: {
          date: string
          new_users: number
          cumulative_users: number
        }[]
      }
      get_session_activity: {
        Args: { days_back?: number }
        Returns: {
          date: string
          total_sessions: number
          total_minutes: number
          unique_users: number
        }[]
      }
      mark_notifications_read: {
        Args: { notification_ids: string[] }
        Returns: void
      }
      mark_all_notifications_read: {
        Args: Record<string, never>
        Returns: void
      }
    }
  }
}

// Helper types
export type RoomCategory = 
  | 'general' 
  | 'programming' 
  | 'design' 
  | 'writing' 
  | 'math' 
  | 'science' 
  | 'languages' 
  | 'music' 
  | 'other'

export type NotificationType =
  | 'achievement'
  | 'friend_request'
  | 'friend_accepted'
  | 'room_invite'
  | 'mention'
  | 'streak_reminder'
  | 'weekly_report'
  | 'level_up'
  | 'system'

export type ActivityType =
  | 'session_completed'
  | 'achievement_earned'
  | 'level_up'
  | 'room_created'
  | 'room_joined'
  | 'streak_milestone'
  | 'friend_added'

export interface ProfileSettings {
  notifications: {
    email: boolean
    push: boolean
    sessionReminders: boolean
    weeklyReport: boolean
  }
  timer: {
    focusDuration: number
    shortBreakDuration: number
    longBreakDuration: number
    sessionsUntilLongBreak: number
    autoStartBreaks: boolean
    autoStartFocus: boolean
    soundEnabled: boolean
    soundVolume: number
  }
  appearance: {
    theme: 'light' | 'dark' | 'system'
    compactMode: boolean
  }
  privacy: {
    showOnLeaderboard: boolean
    showActivityStatus: boolean
    allowRoomInvites: boolean
  }
}

// Table row types for convenience
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Room = Database['public']['Tables']['rooms']['Row']
export type RoomMember = Database['public']['Tables']['room_members']['Row']
export type RoomMessage = Database['public']['Tables']['room_messages']['Row']
export type FocusSession = Database['public']['Tables']['focus_sessions']['Row']
export type DailyStats = Database['public']['Tables']['daily_stats']['Row']
export type WeeklyGoal = Database['public']['Tables']['weekly_goals']['Row']
export type Achievement = Database['public']['Tables']['achievements']['Row']
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row']
export type LeaderboardEntry = Database['public']['Tables']['leaderboard_entries']['Row']
export type Friendship = Database['public']['Tables']['friendships']['Row']
export type Notification = Database['public']['Tables']['notifications']['Row']
export type ActivityFeedItem = Database['public']['Tables']['activity_feed']['Row']
