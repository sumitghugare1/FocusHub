-- FocusHub Database Schema: Achievements & Gamification
-- Tables for badges, achievements, and leaderboards

-- Achievement Definitions Table
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  icon TEXT NOT NULL, -- Icon name or emoji
  
  -- Achievement category
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'streak', 'time', 'social', 'milestone', 'special')),
  
  -- Rarity
  rarity TEXT DEFAULT 'common' CHECK (rarity IN ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  
  -- XP reward
  xp_reward INTEGER DEFAULT 100,
  
  -- Requirements (JSONB for flexibility)
  requirements JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Is it currently achievable?
  is_active BOOLEAN DEFAULT true,
  
  -- Order for display
  display_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Achievements Table (tracks which users have which achievements)
CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  
  -- When it was earned
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Progress towards achievement (for partial achievements)
  progress JSONB DEFAULT '{}'::jsonb,
  
  -- Has the user seen the notification?
  is_notified BOOLEAN DEFAULT false,
  
  UNIQUE(user_id, achievement_id)
);

-- Leaderboard Entries Table (for different time periods)
CREATE TABLE IF NOT EXISTS public.leaderboard_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Time period
  period_type TEXT NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly', 'all_time')),
  period_start DATE NOT NULL,
  
  -- Stats for this period
  total_focus_minutes INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  xp_earned INTEGER DEFAULT 0,
  
  -- Rank (calculated)
  rank INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, period_type, period_start)
);

-- Friend Relationships Table
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'blocked')),
  
  -- Who initiated
  initiated_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, friend_id),
  CHECK(user_id != friend_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_achievements_category ON public.achievements(category);
CREATE INDEX IF NOT EXISTS idx_achievements_rarity ON public.achievements(rarity);
CREATE INDEX IF NOT EXISTS idx_achievements_active ON public.achievements(is_active);

CREATE INDEX IF NOT EXISTS idx_user_achievements_user ON public.user_achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_achievement ON public.user_achievements(achievement_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_earned ON public.user_achievements(earned_at DESC);

CREATE INDEX IF NOT EXISTS idx_leaderboard_period ON public.leaderboard_entries(period_type, period_start);
CREATE INDEX IF NOT EXISTS idx_leaderboard_user ON public.leaderboard_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_rank ON public.leaderboard_entries(period_type, period_start, rank);
CREATE INDEX IF NOT EXISTS idx_leaderboard_focus ON public.leaderboard_entries(period_type, period_start, total_focus_minutes DESC);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON public.friendships(status);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leaderboard_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Achievements (definitions are public)
CREATE POLICY "achievements_select_all" ON public.achievements 
  FOR SELECT USING (true);

-- RLS Policies for User Achievements
CREATE POLICY "user_achievements_select_all" ON public.user_achievements 
  FOR SELECT USING (true); -- Everyone can see achievements

CREATE POLICY "user_achievements_insert_system" ON public.user_achievements 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_achievements_update_own" ON public.user_achievements 
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Leaderboard
CREATE POLICY "leaderboard_select_all" ON public.leaderboard_entries 
  FOR SELECT USING (true); -- Leaderboard is public

CREATE POLICY "leaderboard_insert_own" ON public.leaderboard_entries 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "leaderboard_update_own" ON public.leaderboard_entries 
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Friendships
CREATE POLICY "friendships_select_own" ON public.friendships 
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_insert_own" ON public.friendships 
  FOR INSERT WITH CHECK (auth.uid() = initiated_by);

CREATE POLICY "friendships_update_involved" ON public.friendships 
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "friendships_delete_involved" ON public.friendships 
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- Triggers
DROP TRIGGER IF EXISTS leaderboard_updated_at ON public.leaderboard_entries;
CREATE TRIGGER leaderboard_updated_at
  BEFORE UPDATE ON public.leaderboard_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS friendships_updated_at ON public.friendships;
CREATE TRIGGER friendships_updated_at
  BEFORE UPDATE ON public.friendships
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
