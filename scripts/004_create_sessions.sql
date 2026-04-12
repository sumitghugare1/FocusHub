-- FocusHub Database Schema: Focus Sessions & Analytics
-- Tables for tracking Pomodoro sessions and user analytics

-- Focus Sessions Table
CREATE TABLE IF NOT EXISTS public.focus_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL, -- Optional, can be solo
  
  -- Session type
  session_type TEXT DEFAULT 'focus' CHECK (session_type IN ('focus', 'short_break', 'long_break')),
  
  -- Duration
  planned_duration INTEGER NOT NULL, -- in minutes
  actual_duration INTEGER, -- in minutes (may be different if ended early)
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned', 'paused')),
  
  -- Task being worked on (optional)
  task_name TEXT,
  task_category TEXT,
  
  -- Quality metrics
  was_interrupted BOOLEAN DEFAULT false,
  interruption_count INTEGER DEFAULT 0,
  
  -- Timestamps
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Daily Stats Table (aggregated daily statistics)
CREATE TABLE IF NOT EXISTS public.daily_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  
  -- Session counts
  focus_sessions INTEGER DEFAULT 0,
  completed_sessions INTEGER DEFAULT 0,
  abandoned_sessions INTEGER DEFAULT 0,
  
  -- Time stats
  total_focus_minutes INTEGER DEFAULT 0,
  total_break_minutes INTEGER DEFAULT 0,
  longest_session_minutes INTEGER DEFAULT 0,
  
  -- Categories breakdown (JSONB)
  category_breakdown JSONB DEFAULT '{}'::jsonb,
  
  -- Streak info
  maintained_streak BOOLEAN DEFAULT false,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, date)
);

-- Weekly Goals Table
CREATE TABLE IF NOT EXISTS public.weekly_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Week identifier (Monday of the week)
  week_start DATE NOT NULL,
  
  -- Goals
  target_focus_hours INTEGER DEFAULT 20,
  target_sessions INTEGER DEFAULT 40,
  target_streak_days INTEGER DEFAULT 5,
  
  -- Actual achieved
  achieved_focus_hours INTEGER DEFAULT 0,
  achieved_sessions INTEGER DEFAULT 0,
  achieved_streak_days INTEGER DEFAULT 0,
  
  -- Progress percentage (computed)
  progress_percentage INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, week_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_focus_sessions_user ON public.focus_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_room ON public.focus_sessions(room_id);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_status ON public.focus_sessions(status);
CREATE INDEX IF NOT EXISTS idx_focus_sessions_started ON public.focus_sessions(started_at DESC);

CREATE INDEX IF NOT EXISTS idx_daily_stats_user ON public.daily_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_daily_stats_date ON public.daily_stats(date DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON public.daily_stats(user_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_weekly_goals_user ON public.weekly_goals(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_goals_week ON public.weekly_goals(week_start DESC);

-- Enable RLS
ALTER TABLE public.focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Focus Sessions
CREATE POLICY "focus_sessions_select_own" ON public.focus_sessions 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_insert_own" ON public.focus_sessions 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "focus_sessions_update_own" ON public.focus_sessions 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "focus_sessions_delete_own" ON public.focus_sessions 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Daily Stats
CREATE POLICY "daily_stats_select_own" ON public.daily_stats 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "daily_stats_insert_own" ON public.daily_stats 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "daily_stats_update_own" ON public.daily_stats 
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Weekly Goals
CREATE POLICY "weekly_goals_select_own" ON public.weekly_goals 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "weekly_goals_insert_own" ON public.weekly_goals 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "weekly_goals_update_own" ON public.weekly_goals 
  FOR UPDATE USING (auth.uid() = user_id);

-- Triggers
DROP TRIGGER IF EXISTS daily_stats_updated_at ON public.daily_stats;
CREATE TRIGGER daily_stats_updated_at
  BEFORE UPDATE ON public.daily_stats
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS weekly_goals_updated_at ON public.weekly_goals;
CREATE TRIGGER weekly_goals_updated_at
  BEFORE UPDATE ON public.weekly_goals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
