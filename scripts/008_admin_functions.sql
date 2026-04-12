-- FocusHub Database Schema: Admin Functions & Policies
-- Special functions for admin users

-- Admin policy helper function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add admin policies to existing tables

-- Profiles: Admins can view and update all profiles
DROP POLICY IF EXISTS "profiles_admin_select" ON public.profiles;
CREATE POLICY "profiles_admin_select" ON public.profiles 
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
CREATE POLICY "profiles_admin_update" ON public.profiles 
  FOR UPDATE USING (public.is_admin());

-- Rooms: Admins can manage all rooms
DROP POLICY IF EXISTS "rooms_admin_select" ON public.rooms;
CREATE POLICY "rooms_admin_select" ON public.rooms 
  FOR SELECT USING (public.is_admin());

DROP POLICY IF EXISTS "rooms_admin_update" ON public.rooms;
CREATE POLICY "rooms_admin_update" ON public.rooms 
  FOR UPDATE USING (public.is_admin());

DROP POLICY IF EXISTS "rooms_admin_delete" ON public.rooms;
CREATE POLICY "rooms_admin_delete" ON public.rooms 
  FOR DELETE USING (public.is_admin());

-- Focus Sessions: Admins can view all sessions (for analytics)
DROP POLICY IF EXISTS "focus_sessions_admin_select" ON public.focus_sessions;
CREATE POLICY "focus_sessions_admin_select" ON public.focus_sessions 
  FOR SELECT USING (public.is_admin());

-- Achievements: Admins can manage achievements
DROP POLICY IF EXISTS "achievements_admin_all" ON public.achievements;
CREATE POLICY "achievements_admin_all" ON public.achievements 
  FOR ALL USING (public.is_admin());

-- Admin Stats Functions

-- Get platform statistics
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS TABLE (
  total_users BIGINT,
  total_rooms BIGINT,
  total_sessions BIGINT,
  total_focus_minutes BIGINT,
  active_users_today BIGINT,
  new_users_today BIGINT,
  active_rooms BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM public.profiles)::BIGINT as total_users,
    (SELECT COUNT(*) FROM public.rooms WHERE status = 'active')::BIGINT as total_rooms,
    (SELECT COUNT(*) FROM public.focus_sessions)::BIGINT as total_sessions,
    (SELECT COALESCE(SUM(actual_duration), 0) FROM public.focus_sessions WHERE status = 'completed')::BIGINT as total_focus_minutes,
    (SELECT COUNT(DISTINCT user_id) FROM public.focus_sessions WHERE DATE(started_at) = CURRENT_DATE)::BIGINT as active_users_today,
    (SELECT COUNT(*) FROM public.profiles WHERE DATE(created_at) = CURRENT_DATE)::BIGINT as new_users_today,
    (SELECT COUNT(*) FROM public.rooms WHERE status = 'active' AND EXISTS (
      SELECT 1 FROM public.room_members WHERE room_id = rooms.id AND status != 'offline'
    ))::BIGINT as active_rooms;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get user growth over time
CREATE OR REPLACE FUNCTION public.get_user_growth(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  new_users BIGINT,
  cumulative_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  WITH daily_signups AS (
    SELECT 
      DATE(created_at) as signup_date,
      COUNT(*) as count
    FROM public.profiles
    WHERE created_at >= CURRENT_DATE - days_back
    GROUP BY DATE(created_at)
  )
  SELECT 
    d.signup_date as date,
    COALESCE(ds.count, 0) as new_users,
    SUM(COALESCE(ds.count, 0)) OVER (ORDER BY d.signup_date) as cumulative_users
  FROM generate_series(
    CURRENT_DATE - days_back,
    CURRENT_DATE,
    '1 day'::interval
  ) as d(signup_date)
  LEFT JOIN daily_signups ds ON d.signup_date = ds.signup_date
  ORDER BY d.signup_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get session activity over time
CREATE OR REPLACE FUNCTION public.get_session_activity(days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  date DATE,
  total_sessions BIGINT,
  total_minutes BIGINT,
  unique_users BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(started_at) as date,
    COUNT(*) as total_sessions,
    COALESCE(SUM(actual_duration), 0)::BIGINT as total_minutes,
    COUNT(DISTINCT user_id) as unique_users
  FROM public.focus_sessions
  WHERE started_at >= CURRENT_DATE - days_back
  GROUP BY DATE(started_at)
  ORDER BY date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_growth(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_activity(INTEGER) TO authenticated;
