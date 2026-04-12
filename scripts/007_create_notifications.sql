-- FocusHub Database Schema: Notifications & Activity
-- Tables for user notifications and activity feed

-- Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification type
  type TEXT NOT NULL CHECK (type IN (
    'achievement', 'friend_request', 'friend_accepted', 
    'room_invite', 'mention', 'streak_reminder', 
    'weekly_report', 'level_up', 'system'
  )),
  
  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  
  -- Related entity (polymorphic)
  related_type TEXT, -- 'achievement', 'room', 'user', etc.
  related_id UUID,
  
  -- Additional data
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

-- Activity Feed Table (public activity)
CREATE TABLE IF NOT EXISTS public.activity_feed (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Activity type
  type TEXT NOT NULL CHECK (type IN (
    'session_completed', 'achievement_earned', 'level_up',
    'room_created', 'room_joined', 'streak_milestone',
    'friend_added'
  )),
  
  -- Description
  description TEXT NOT NULL,
  
  -- Related entity
  related_type TEXT,
  related_id UUID,
  
  -- Additional data
  data JSONB DEFAULT '{}'::jsonb,
  
  -- Visibility
  is_public BOOLEAN DEFAULT true,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.notifications(user_id, is_read) WHERE NOT is_read;
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON public.notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_activity_user ON public.activity_feed(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_type ON public.activity_feed(type);
CREATE INDEX IF NOT EXISTS idx_activity_created ON public.activity_feed(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_public ON public.activity_feed(is_public, created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Notifications
CREATE POLICY "notifications_select_own" ON public.notifications 
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "notifications_insert_system" ON public.notifications 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "notifications_update_own" ON public.notifications 
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "notifications_delete_own" ON public.notifications 
  FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for Activity Feed
CREATE POLICY "activity_select_public" ON public.activity_feed 
  FOR SELECT USING (is_public OR auth.uid() = user_id);

CREATE POLICY "activity_insert_own" ON public.activity_feed 
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Function to mark notifications as read
CREATE OR REPLACE FUNCTION public.mark_notifications_read(notification_ids UUID[])
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE id = ANY(notification_ids) AND user_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to mark all notifications as read
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = true, read_at = NOW()
  WHERE user_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
