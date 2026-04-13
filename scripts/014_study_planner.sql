create table if not exists public.study_planner_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade,
  title text not null,
  description text,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'completed')),
  estimated_minutes integer,
  completed_at timestamptz,
  order_index integer default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_study_planner_items_user on public.study_planner_items(user_id);
create index if not exists idx_study_planner_items_room on public.study_planner_items(room_id);
create index if not exists idx_study_planner_items_status on public.study_planner_items(status);
create index if not exists idx_study_planner_items_due on public.study_planner_items(due_date);
create index if not exists idx_study_planner_items_created on public.study_planner_items(created_at desc);

alter table public.study_planner_items enable row level security;

drop policy if exists study_planner_items_select on public.study_planner_items;
create policy study_planner_items_select on public.study_planner_items
  for select using (
    auth.uid() = user_id
    or (
      room_id is not null and exists (
        select 1
        from public.room_members
        where room_id = study_planner_items.room_id
          and user_id = auth.uid()
      )
    )
    or (
      room_id is not null and exists (
        select 1
        from public.rooms
        where id = study_planner_items.room_id
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists study_planner_items_insert on public.study_planner_items;
create policy study_planner_items_insert on public.study_planner_items
  for insert with check (
    auth.uid() = user_id
    and (
      room_id is null
      or exists (
        select 1
        from public.room_members
        where room_id = study_planner_items.room_id
          and user_id = auth.uid()
      )
      or exists (
        select 1
        from public.rooms
        where id = study_planner_items.room_id
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists study_planner_items_update on public.study_planner_items;
create policy study_planner_items_update on public.study_planner_items
  for update using (
    auth.uid() = user_id
    or (
      room_id is not null and exists (
        select 1
        from public.rooms
        where id = study_planner_items.room_id
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists study_planner_items_delete on public.study_planner_items;
create policy study_planner_items_delete on public.study_planner_items
  for delete using (
    auth.uid() = user_id
    or (
      room_id is not null and exists (
        select 1
        from public.rooms
        where id = study_planner_items.room_id
          and host_id = auth.uid()
      )
    )
  );

drop trigger if exists study_planner_items_updated_at on public.study_planner_items;
create trigger study_planner_items_updated_at
  before update on public.study_planner_items
  for each row
  execute function public.handle_updated_at();
