-- One-time backfill for leaderboard entries from existing focus sessions.
-- Safe to run multiple times because it uses UPSERT.

-- 1) All-time leaderboard entries
insert into public.leaderboard_entries (
  user_id,
  period_type,
  period_start,
  total_focus_minutes,
  total_sessions,
  longest_streak,
  xp_earned,
  rank
)
select
  fs.user_id,
  'all_time'::text as period_type,
  '1970-01-01'::date as period_start,
  coalesce(sum(fs.actual_duration), 0)::int as total_focus_minutes,
  count(*)::int as total_sessions,
  coalesce(max(p.current_streak), 0)::int as longest_streak,
  coalesce(max(p.xp), 0)::int as xp_earned,
  null::int as rank
from public.focus_sessions fs
join public.profiles p on p.id = fs.user_id
where fs.status = 'completed'
  and fs.session_type = 'focus'
group by fs.user_id
on conflict (user_id, period_type, period_start)
do update set
  total_focus_minutes = excluded.total_focus_minutes,
  total_sessions = excluded.total_sessions,
  longest_streak = excluded.longest_streak,
  xp_earned = excluded.xp_earned,
  rank = null,
  updated_at = now();

-- 2) Weekly leaderboard entries (historical)
insert into public.leaderboard_entries (
  user_id,
  period_type,
  period_start,
  total_focus_minutes,
  total_sessions,
  longest_streak,
  xp_earned,
  rank
)
select
  fs.user_id,
  'weekly'::text as period_type,
  (date_trunc('week', fs.ended_at at time zone 'UTC')::date)::date as period_start,
  coalesce(sum(fs.actual_duration), 0)::int as total_focus_minutes,
  count(*)::int as total_sessions,
  coalesce(max(p.current_streak), 0)::int as longest_streak,
  coalesce(max(p.xp), 0)::int as xp_earned,
  null::int as rank
from public.focus_sessions fs
join public.profiles p on p.id = fs.user_id
where fs.status = 'completed'
  and fs.session_type = 'focus'
  and fs.ended_at is not null
group by fs.user_id, (date_trunc('week', fs.ended_at at time zone 'UTC')::date)
on conflict (user_id, period_type, period_start)
do update set
  total_focus_minutes = excluded.total_focus_minutes,
  total_sessions = excluded.total_sessions,
  longest_streak = excluded.longest_streak,
  xp_earned = excluded.xp_earned,
  rank = null,
  updated_at = now();

-- 3) Monthly leaderboard entries (historical)
insert into public.leaderboard_entries (
  user_id,
  period_type,
  period_start,
  total_focus_minutes,
  total_sessions,
  longest_streak,
  xp_earned,
  rank
)
select
  fs.user_id,
  'monthly'::text as period_type,
  date_trunc('month', fs.ended_at at time zone 'UTC')::date as period_start,
  coalesce(sum(fs.actual_duration), 0)::int as total_focus_minutes,
  count(*)::int as total_sessions,
  coalesce(max(p.current_streak), 0)::int as longest_streak,
  coalesce(max(p.xp), 0)::int as xp_earned,
  null::int as rank
from public.focus_sessions fs
join public.profiles p on p.id = fs.user_id
where fs.status = 'completed'
  and fs.session_type = 'focus'
  and fs.ended_at is not null
group by fs.user_id, date_trunc('month', fs.ended_at at time zone 'UTC')::date
on conflict (user_id, period_type, period_start)
do update set
  total_focus_minutes = excluded.total_focus_minutes,
  total_sessions = excluded.total_sessions,
  longest_streak = excluded.longest_streak,
  xp_earned = excluded.xp_earned,
  rank = null,
  updated_at = now();
