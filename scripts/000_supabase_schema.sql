-- FocusHub Supabase Schema
-- Run this file in the Supabase SQL editor to create the required tables, policies, functions, and realtime config.

create extension if not exists pgcrypto;

-- Shared trigger helper
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  username text unique,
  full_name text,
  avatar_url text,
  bio text,
  role text default 'user' check (role in ('user', 'admin', 'moderator')),
  timezone text default 'UTC',
  total_focus_time integer default 0,
  total_sessions integer default 0,
  current_streak integer default 0,
  longest_streak integer default 0,
  level integer default 1,
  xp integer default 0,
  settings jsonb default '{
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
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_active_at timestamptz default now()
);

create index if not exists idx_profiles_username on public.profiles(username);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_level on public.profiles(level desc);
create index if not exists idx_profiles_total_focus_time on public.profiles(total_focus_time desc);

alter table public.profiles enable row level security;

drop policy if exists profiles_select_public on public.profiles;
create policy profiles_select_public on public.profiles
  for select using (true);

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id);

drop policy if exists profiles_delete_own on public.profiles;
create policy profiles_delete_own on public.profiles
  for delete using (auth.uid() = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    username,
    full_name,
    avatar_url
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'full_name', null),
    coalesce(new.raw_user_meta_data ->> 'avatar_url', null)
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.handle_updated_at();

-- Rooms
create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  host_id uuid not null references public.profiles(id) on delete cascade,
  category text default 'general' check (category in ('general', 'programming', 'design', 'writing', 'math', 'science', 'languages', 'music', 'other')),
  is_private boolean default false,
  password_hash text,
  max_participants integer default 10,
  focus_duration integer default 25,
  break_duration integer default 5,
  is_timer_synced boolean default true,
  status text default 'active' check (status in ('active', 'archived', 'scheduled')),
  scheduled_start timestamptz,
  scheduled_end timestamptz,
  total_sessions integer default 0,
  total_focus_minutes integer default 0,
  tags text[] default '{}'::text[],
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text default 'member' check (role in ('host', 'moderator', 'member')),
  status text default 'active' check (status in ('active', 'idle', 'focusing', 'break', 'offline')),
  focus_time_in_room integer default 0,
  sessions_in_room integer default 0,
  joined_at timestamptz default now(),
  last_active_at timestamptz default now(),
  unique(room_id, user_id)
);

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  message_type text default 'text' check (message_type in ('text', 'system', 'achievement')),
  reply_to_id uuid references public.room_messages(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_rooms_host on public.rooms(host_id);
create index if not exists idx_rooms_category on public.rooms(category);
create index if not exists idx_rooms_status on public.rooms(status);
create index if not exists idx_rooms_is_private on public.rooms(is_private);
create index if not exists idx_rooms_tags on public.rooms using gin(tags);

create index if not exists idx_room_members_room on public.room_members(room_id);
create index if not exists idx_room_members_user on public.room_members(user_id);
create index if not exists idx_room_members_status on public.room_members(status);

create index if not exists idx_room_messages_room on public.room_messages(room_id);
create index if not exists idx_room_messages_user on public.room_messages(user_id);
create index if not exists idx_room_messages_created on public.room_messages(created_at desc);

alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.room_messages enable row level security;

drop policy if exists rooms_select_public on public.rooms;
create policy rooms_select_public on public.rooms
  for select using (auth.uid() is not null);

drop policy if exists rooms_insert_authenticated on public.rooms;
create policy rooms_insert_authenticated on public.rooms
  for insert with check (auth.uid() = host_id);

drop policy if exists rooms_update_host on public.rooms;
create policy rooms_update_host on public.rooms
  for update using (auth.uid() = host_id);

drop policy if exists rooms_delete_host on public.rooms;
create policy rooms_delete_host on public.rooms
  for delete using (auth.uid() = host_id);

drop policy if exists room_members_select_own on public.room_members;
create policy room_members_select_own on public.room_members
  for select using (auth.uid() = user_id or exists (
    select 1 from public.rooms where id = room_members.room_id and host_id = auth.uid()
  ));

drop policy if exists room_members_insert_participant on public.room_members;
create policy room_members_insert_participant on public.room_members
  for insert with check (auth.uid() = user_id or auth.uid() = (select host_id from public.rooms where id = room_id));

drop policy if exists room_members_update_own on public.room_members;
create policy room_members_update_own on public.room_members
  for update using (auth.uid() = user_id or exists (
    select 1 from public.rooms where id = room_members.room_id and host_id = auth.uid()
  ));

drop policy if exists room_members_delete_own on public.room_members;
create policy room_members_delete_own on public.room_members
  for delete using (auth.uid() = user_id or exists (
    select 1 from public.rooms where id = room_members.room_id and host_id = auth.uid()
  ));

drop policy if exists room_messages_select_room on public.room_messages;
create policy room_messages_select_room on public.room_messages
  for select using (exists (
    select 1 from public.room_members
    where room_id = room_messages.room_id and user_id = auth.uid()
  ));

drop policy if exists room_messages_insert_member on public.room_messages;
create policy room_messages_insert_member on public.room_messages
  for insert with check (auth.uid() = user_id and exists (
    select 1 from public.room_members
    where room_id = room_messages.room_id and user_id = auth.uid()
  ));

drop policy if exists room_messages_update_own on public.room_messages;
create policy room_messages_update_own on public.room_messages
  for update using (auth.uid() = user_id);

drop policy if exists room_messages_delete_own on public.room_messages;
create policy room_messages_delete_own on public.room_messages
  for delete using (auth.uid() = user_id);

drop trigger if exists rooms_updated_at on public.rooms;
create trigger rooms_updated_at
  before update on public.rooms
  for each row
  execute function public.handle_updated_at();

drop trigger if exists room_messages_updated_at on public.room_messages;
create trigger room_messages_updated_at
  before update on public.room_messages
  for each row
  execute function public.handle_updated_at();

create or replace function public.get_room_access(room_id uuid)
returns table (
  id uuid,
  name text,
  description text,
  category text,
  is_private boolean,
  max_participants integer,
  status text,
  host_id uuid,
  host_name text,
  participant_count bigint,
  is_member boolean,
  requires_password boolean
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.name,
    r.description,
    r.category,
    r.is_private,
    r.max_participants,
    r.status,
    r.host_id,
    coalesce(p.full_name, p.username, 'Host') as host_name,
    (
      select count(*)
      from public.room_members rm
      where rm.room_id = r.id
    ) as participant_count,
    (
      r.host_id = auth.uid() or exists (
        select 1
        from public.room_members rm
        where rm.room_id = r.id
          and rm.user_id = auth.uid()
      )
    ) as is_member,
    (
      r.is_private and not (
        r.host_id = auth.uid() or exists (
          select 1
          from public.room_members rm
          where rm.room_id = r.id
            and rm.user_id = auth.uid()
        )
      )
    ) as requires_password
  from public.rooms r
  left join public.profiles p on p.id = r.host_id
  where r.id = room_id;
$$;

create or replace function public.get_room_join_access(room_id uuid)
returns table (
  id uuid,
  host_id uuid,
  is_private boolean,
  password_hash text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.id,
    r.host_id,
    r.is_private,
    r.password_hash
  from public.rooms r
  where r.id = room_id;
$$;

-- Focus sessions, daily stats, weekly goals
create table if not exists public.focus_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete set null,
  session_type text default 'focus' check (session_type in ('focus', 'short_break', 'long_break')),
  planned_duration integer not null,
  actual_duration integer,
  status text default 'active' check (status in ('active', 'completed', 'abandoned', 'paused')),
  task_name text,
  task_category text,
  was_interrupted boolean default false,
  interruption_count integer default 0,
  started_at timestamptz default now(),
  ended_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists public.daily_stats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  date date not null,
  focus_sessions integer default 0,
  completed_sessions integer default 0,
  abandoned_sessions integer default 0,
  total_focus_minutes integer default 0,
  total_break_minutes integer default 0,
  longest_session_minutes integer default 0,
  category_breakdown jsonb default '{}'::jsonb,
  maintained_streak boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, date)
);

create table if not exists public.weekly_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  target_focus_hours integer default 20,
  target_sessions integer default 40,
  target_streak_days integer default 5,
  achieved_focus_hours integer default 0,
  achieved_sessions integer default 0,
  achieved_streak_days integer default 0,
  progress_percentage integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

create index if not exists idx_focus_sessions_user on public.focus_sessions(user_id);
create index if not exists idx_focus_sessions_room on public.focus_sessions(room_id);
create index if not exists idx_focus_sessions_status on public.focus_sessions(status);
create index if not exists idx_focus_sessions_started on public.focus_sessions(started_at desc);

create index if not exists idx_daily_stats_user on public.daily_stats(user_id);
create index if not exists idx_daily_stats_date on public.daily_stats(date desc);
create index if not exists idx_daily_stats_user_date on public.daily_stats(user_id, date desc);

create index if not exists idx_weekly_goals_user on public.weekly_goals(user_id);
create index if not exists idx_weekly_goals_week on public.weekly_goals(week_start desc);

alter table public.focus_sessions enable row level security;
alter table public.daily_stats enable row level security;
alter table public.weekly_goals enable row level security;

drop policy if exists focus_sessions_select_own on public.focus_sessions;
create policy focus_sessions_select_own on public.focus_sessions
  for select using (auth.uid() = user_id);

drop policy if exists focus_sessions_insert_own on public.focus_sessions;
create policy focus_sessions_insert_own on public.focus_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists focus_sessions_update_own on public.focus_sessions;
create policy focus_sessions_update_own on public.focus_sessions
  for update using (auth.uid() = user_id);

drop policy if exists focus_sessions_delete_own on public.focus_sessions;
create policy focus_sessions_delete_own on public.focus_sessions
  for delete using (auth.uid() = user_id);

drop policy if exists daily_stats_select_own on public.daily_stats;
create policy daily_stats_select_own on public.daily_stats
  for select using (auth.uid() = user_id);

drop policy if exists daily_stats_insert_own on public.daily_stats;
create policy daily_stats_insert_own on public.daily_stats
  for insert with check (auth.uid() = user_id);

drop policy if exists daily_stats_update_own on public.daily_stats;
create policy daily_stats_update_own on public.daily_stats
  for update using (auth.uid() = user_id);

drop policy if exists weekly_goals_select_own on public.weekly_goals;
create policy weekly_goals_select_own on public.weekly_goals
  for select using (auth.uid() = user_id);

drop policy if exists weekly_goals_insert_own on public.weekly_goals;
create policy weekly_goals_insert_own on public.weekly_goals
  for insert with check (auth.uid() = user_id);

drop policy if exists weekly_goals_update_own on public.weekly_goals;
create policy weekly_goals_update_own on public.weekly_goals
  for update using (auth.uid() = user_id);

drop trigger if exists focus_sessions_updated_at on public.focus_sessions;
create trigger focus_sessions_updated_at
  before update on public.focus_sessions
  for each row
  execute function public.handle_updated_at();

drop trigger if exists daily_stats_updated_at on public.daily_stats;
create trigger daily_stats_updated_at
  before update on public.daily_stats
  for each row
  execute function public.handle_updated_at();

drop trigger if exists weekly_goals_updated_at on public.weekly_goals;
create trigger weekly_goals_updated_at
  before update on public.weekly_goals
  for each row
  execute function public.handle_updated_at();

-- Achievements and social features
create table if not exists public.achievements (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  icon text not null,
  category text default 'general' check (category in ('general', 'streak', 'time', 'social', 'milestone', 'special')),
  rarity text default 'common' check (rarity in ('common', 'uncommon', 'rare', 'epic', 'legendary')),
  xp_reward integer default 100,
  requirements jsonb not null default '{}'::jsonb,
  is_active boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

create table if not exists public.user_achievements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  earned_at timestamptz default now(),
  progress jsonb default '{}'::jsonb,
  is_notified boolean default false,
  unique(user_id, achievement_id)
);

create table if not exists public.leaderboard_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  period_type text not null check (period_type in ('daily', 'weekly', 'monthly', 'all_time')),
  period_start date not null,
  total_focus_minutes integer default 0,
  total_sessions integer default 0,
  longest_streak integer default 0,
  xp_earned integer default 0,
  rank integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, period_type, period_start)
);

create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  friend_id uuid not null references public.profiles(id) on delete cascade,
  status text default 'pending' check (status in ('pending', 'accepted', 'blocked')),
  initiated_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, friend_id),
  check (user_id != friend_id)
);

create index if not exists idx_achievements_category on public.achievements(category);
create index if not exists idx_achievements_rarity on public.achievements(rarity);
create index if not exists idx_achievements_active on public.achievements(is_active);

create index if not exists idx_user_achievements_user on public.user_achievements(user_id);
create index if not exists idx_user_achievements_achievement on public.user_achievements(achievement_id);
create index if not exists idx_user_achievements_earned on public.user_achievements(earned_at desc);

create index if not exists idx_leaderboard_period on public.leaderboard_entries(period_type, period_start);
create index if not exists idx_leaderboard_user on public.leaderboard_entries(user_id);
create index if not exists idx_leaderboard_rank on public.leaderboard_entries(period_type, period_start, rank);
create index if not exists idx_leaderboard_focus on public.leaderboard_entries(period_type, period_start, total_focus_minutes desc);

create index if not exists idx_friendships_user on public.friendships(user_id);
create index if not exists idx_friendships_friend on public.friendships(friend_id);
create index if not exists idx_friendships_status on public.friendships(status);

alter table public.achievements enable row level security;
alter table public.user_achievements enable row level security;
alter table public.leaderboard_entries enable row level security;
alter table public.friendships enable row level security;

drop policy if exists achievements_select_all on public.achievements;
create policy achievements_select_all on public.achievements
  for select using (true);

drop policy if exists user_achievements_select_all on public.user_achievements;
create policy user_achievements_select_all on public.user_achievements
  for select using (true);

drop policy if exists user_achievements_insert_system on public.user_achievements;
create policy user_achievements_insert_system on public.user_achievements
  for insert with check (auth.uid() = user_id);

drop policy if exists user_achievements_update_own on public.user_achievements;
create policy user_achievements_update_own on public.user_achievements
  for update using (auth.uid() = user_id);

drop policy if exists leaderboard_select_all on public.leaderboard_entries;
create policy leaderboard_select_all on public.leaderboard_entries
  for select using (true);

drop policy if exists leaderboard_insert_own on public.leaderboard_entries;
create policy leaderboard_insert_own on public.leaderboard_entries
  for insert with check (auth.uid() = user_id);

drop policy if exists leaderboard_update_own on public.leaderboard_entries;
create policy leaderboard_update_own on public.leaderboard_entries
  for update using (auth.uid() = user_id);

drop policy if exists friendships_select_own on public.friendships;
create policy friendships_select_own on public.friendships
  for select using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists friendships_insert_own on public.friendships;
create policy friendships_insert_own on public.friendships
  for insert with check (auth.uid() = initiated_by);

drop policy if exists friendships_update_involved on public.friendships;
create policy friendships_update_involved on public.friendships
  for update using (auth.uid() = user_id or auth.uid() = friend_id);

drop policy if exists friendships_delete_involved on public.friendships;
create policy friendships_delete_involved on public.friendships
  for delete using (auth.uid() = user_id or auth.uid() = friend_id);

drop trigger if exists leaderboard_updated_at on public.leaderboard_entries;
create trigger leaderboard_updated_at
  before update on public.leaderboard_entries
  for each row
  execute function public.handle_updated_at();

drop trigger if exists friendships_updated_at on public.friendships;
create trigger friendships_updated_at
  before update on public.friendships
  for each row
  execute function public.handle_updated_at();

-- Notifications and activity feed
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('achievement', 'friend_request', 'friend_accepted', 'room_invite', 'mention', 'streak_reminder', 'weekly_report', 'level_up', 'system')),
  title text not null,
  message text not null,
  related_type text,
  related_id uuid,
  data jsonb default '{}'::jsonb,
  is_read boolean default false,
  created_at timestamptz default now(),
  read_at timestamptz
);

create table if not exists public.activity_feed (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('session_completed', 'achievement_earned', 'level_up', 'room_created', 'room_joined', 'streak_milestone', 'friend_added')),
  description text not null,
  related_type text,
  related_id uuid,
  data jsonb default '{}'::jsonb,
  is_public boolean default true,
  created_at timestamptz default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id);
create index if not exists idx_notifications_unread on public.notifications(user_id, is_read) where not is_read;
create index if not exists idx_notifications_type on public.notifications(type);
create index if not exists idx_notifications_created on public.notifications(created_at desc);

create index if not exists idx_activity_user on public.activity_feed(user_id);
create index if not exists idx_activity_type on public.activity_feed(type);
create index if not exists idx_activity_created on public.activity_feed(created_at desc);
create index if not exists idx_activity_public on public.activity_feed(is_public, created_at desc);

alter table public.notifications enable row level security;
alter table public.activity_feed enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select using (auth.uid() = user_id);

drop policy if exists notifications_insert_system on public.notifications;
create policy notifications_insert_system on public.notifications
  for insert with check (auth.uid() = user_id);

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update using (auth.uid() = user_id);

drop policy if exists notifications_delete_own on public.notifications;
create policy notifications_delete_own on public.notifications
  for delete using (auth.uid() = user_id);

drop policy if exists activity_select_public on public.activity_feed;
create policy activity_select_public on public.activity_feed
  for select using (is_public or auth.uid() = user_id);

drop policy if exists activity_insert_own on public.activity_feed;
create policy activity_insert_own on public.activity_feed
  for insert with check (auth.uid() = user_id);

create or replace function public.mark_notifications_read(notification_ids uuid[])
returns void as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where id = any(notification_ids) and user_id = auth.uid();
end;
$$ language plpgsql security definer;

create or replace function public.mark_all_notifications_read()
returns void as $$
begin
  update public.notifications
  set is_read = true, read_at = now()
  where user_id = auth.uid() and is_read = false;
end;
$$ language plpgsql security definer;

-- Admin functions and policies
create or replace function public.is_admin()
returns boolean as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
end;
$$ language plpgsql security definer;

drop policy if exists profiles_admin_select on public.profiles;
create policy profiles_admin_select on public.profiles
  for select using (public.is_admin());

drop policy if exists profiles_admin_update on public.profiles;
create policy profiles_admin_update on public.profiles
  for update using (public.is_admin());

drop policy if exists rooms_admin_select on public.rooms;
create policy rooms_admin_select on public.rooms
  for select using (public.is_admin());

drop policy if exists rooms_admin_update on public.rooms;
create policy rooms_admin_update on public.rooms
  for update using (public.is_admin());

drop policy if exists rooms_admin_delete on public.rooms;
create policy rooms_admin_delete on public.rooms
  for delete using (public.is_admin());

drop policy if exists focus_sessions_admin_select on public.focus_sessions;
create policy focus_sessions_admin_select on public.focus_sessions
  for select using (public.is_admin());

drop policy if exists achievements_admin_all on public.achievements;
create policy achievements_admin_all on public.achievements
  for all using (public.is_admin());

create or replace function public.get_platform_stats()
returns table (
  total_users bigint,
  total_rooms bigint,
  total_sessions bigint,
  total_focus_minutes bigint,
  active_users_today bigint,
  new_users_today bigint,
  active_rooms bigint
) as $$
begin
  return query
  select
    (select count(*) from public.profiles)::bigint,
    (select count(*) from public.rooms where status = 'active')::bigint,
    (select count(*) from public.focus_sessions)::bigint,
    (select coalesce(sum(actual_duration), 0) from public.focus_sessions where status = 'completed')::bigint,
    (select count(distinct user_id) from public.focus_sessions where date(started_at) = current_date)::bigint,
    (select count(*) from public.profiles where date(created_at) = current_date)::bigint,
    (select count(*) from public.rooms where status = 'active' and exists (
      select 1 from public.room_members where room_id = rooms.id and status != 'offline'
    ))::bigint;
end;
$$ language plpgsql security definer;

create or replace function public.get_user_growth(days_back integer default 30)
returns table (
  date date,
  new_users bigint,
  cumulative_users bigint
) as $$
begin
  return query
  with daily_signups as (
    select
      date(created_at) as signup_date,
      count(*) as count
    from public.profiles
    where created_at >= current_date - days_back
    group by date(created_at)
  )
  select
    d.signup_date as date,
    coalesce(ds.count, 0) as new_users,
    sum(coalesce(ds.count, 0)) over (order by d.signup_date) as cumulative_users
  from generate_series(
    current_date - days_back,
    current_date,
    interval '1 day'
  ) as d(signup_date)
  left join daily_signups ds on d.signup_date = ds.signup_date
  order by d.signup_date;
end;
$$ language plpgsql security definer;

create or replace function public.get_session_activity(days_back integer default 30)
returns table (
  date date,
  total_sessions bigint,
  total_minutes bigint,
  unique_users bigint
) as $$
begin
  return query
  select
    date(started_at) as date,
    count(*) as total_sessions,
    coalesce(sum(actual_duration), 0)::bigint as total_minutes,
    count(distinct user_id) as unique_users
  from public.focus_sessions
  where started_at >= current_date - days_back
  group by date(started_at)
  order by date;
end;
$$ language plpgsql security definer;

grant execute on function public.get_platform_stats() to authenticated;
grant execute on function public.get_user_growth(integer) to authenticated;
grant execute on function public.get_session_activity(integer) to authenticated;

-- Realtime publication
do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_members'
  ) then
    alter publication supabase_realtime add table public.room_members;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'room_messages'
  ) then
    alter publication supabase_realtime add table public.room_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'focus_sessions'
  ) then
    alter publication supabase_realtime add table public.focus_sessions;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'rooms'
  ) then
    alter publication supabase_realtime add table public.rooms;
  end if;
end
$$;
