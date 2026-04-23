-- AI Coach module storage

create table if not exists public.ai_daily_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_date date not null,
  available_minutes integer not null,
  input_context jsonb not null default '{}'::jsonb,
  plan_json jsonb not null,
  source text not null default 'rules' check (source in ('rules', 'gemini')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, plan_date)
);

create table if not exists public.ai_weekly_reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  week_start date not null,
  reflection_json jsonb not null,
  source text not null default 'rules' check (source in ('rules', 'gemini')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(user_id, week_start)
);

create index if not exists idx_ai_daily_plans_user_date on public.ai_daily_plans(user_id, plan_date desc);
create index if not exists idx_ai_weekly_reflections_user_week on public.ai_weekly_reflections(user_id, week_start desc);

alter table public.ai_daily_plans enable row level security;
alter table public.ai_weekly_reflections enable row level security;

drop policy if exists ai_daily_plans_select_own on public.ai_daily_plans;
create policy ai_daily_plans_select_own on public.ai_daily_plans
  for select using (auth.uid() = user_id);

drop policy if exists ai_daily_plans_insert_own on public.ai_daily_plans;
create policy ai_daily_plans_insert_own on public.ai_daily_plans
  for insert with check (auth.uid() = user_id);

drop policy if exists ai_daily_plans_update_own on public.ai_daily_plans;
create policy ai_daily_plans_update_own on public.ai_daily_plans
  for update using (auth.uid() = user_id);

drop policy if exists ai_weekly_reflections_select_own on public.ai_weekly_reflections;
create policy ai_weekly_reflections_select_own on public.ai_weekly_reflections
  for select using (auth.uid() = user_id);

drop policy if exists ai_weekly_reflections_insert_own on public.ai_weekly_reflections;
create policy ai_weekly_reflections_insert_own on public.ai_weekly_reflections
  for insert with check (auth.uid() = user_id);

drop policy if exists ai_weekly_reflections_update_own on public.ai_weekly_reflections;
create policy ai_weekly_reflections_update_own on public.ai_weekly_reflections
  for update using (auth.uid() = user_id);

drop trigger if exists ai_daily_plans_updated_at on public.ai_daily_plans;
create trigger ai_daily_plans_updated_at
  before update on public.ai_daily_plans
  for each row
  execute function public.handle_updated_at();

drop trigger if exists ai_weekly_reflections_updated_at on public.ai_weekly_reflections;
create trigger ai_weekly_reflections_updated_at
  before update on public.ai_weekly_reflections
  for each row
  execute function public.handle_updated_at();
