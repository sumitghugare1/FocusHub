-- FocusHub Database Schema: Profiles Table
-- This creates the user profiles table that extends auth.users

-- Create profiles table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  username TEXT UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'moderator')),
  timezone TEXT DEFAULT 'UTC',
  
  -- Stats
  total_focus_time INTEGER DEFAULT 0, -- in minutes
  total_sessions INTEGER DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp INTEGER DEFAULT 0,
  
  -- Settings stored as JSONB
  settings JSONB DEFAULT '{
    "notifications": {
      "email": true,
      "push": true,
      "sessionReminders": true,
      "weeklyReport": true
    },
    "timer": {
      "focusDuration": 25,
      "shortBreakDuration": 5,
      "longBreakDuration": 15,
      "sessionsUntilLongBreak": 4,
      "autoStartBreaks": false,
      "autoStartFocus": false,
      "soundEnabled": true,
      "soundVolume": 80
    },
    "appearance": {
      "theme": "dark",
      "compactMode": false
    },
    "privacy": {
      "showOnLeaderboard": true,
      "showActivityStatus": true,
      "allowRoomInvites": true
    }
  }'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_level ON public.profiles(level DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_total_focus_time ON public.profiles(total_focus_time DESC);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "profiles_select_public" ON public.profiles 
  FOR SELECT USING (true); -- Anyone can view profiles

CREATE POLICY "profiles_insert_own" ON public.profiles 
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_own" ON public.profiles 
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "profiles_delete_own" ON public.profiles 
  FOR DELETE USING (auth.uid() = id);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
