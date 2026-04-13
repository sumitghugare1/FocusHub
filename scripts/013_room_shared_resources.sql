create table if not exists public.room_shared_resources (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (resource_type in ('note', 'file')),
  title text,
  content text,
  file_name text,
  file_path text,
  mime_type text,
  file_size bigint,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_room_shared_resources_room on public.room_shared_resources(room_id);
create index if not exists idx_room_shared_resources_user on public.room_shared_resources(user_id);
create index if not exists idx_room_shared_resources_type on public.room_shared_resources(resource_type);
create index if not exists idx_room_shared_resources_created on public.room_shared_resources(created_at desc);

alter table public.room_shared_resources enable row level security;

drop policy if exists room_shared_resources_select_member on public.room_shared_resources;
create policy room_shared_resources_select_member on public.room_shared_resources
  for select using (
    exists (
      select 1
      from public.room_members
      where room_id = room_shared_resources.room_id
        and user_id = auth.uid()
    ) or exists (
      select 1
      from public.rooms
      where id = room_shared_resources.room_id
        and host_id = auth.uid()
    )
  );

drop policy if exists room_shared_resources_insert_member on public.room_shared_resources;
create policy room_shared_resources_insert_member on public.room_shared_resources
  for insert with check (
    auth.uid() = user_id and exists (
      select 1
      from public.room_members
      where room_id = room_shared_resources.room_id
        and user_id = auth.uid()
    ) or auth.uid() = user_id and exists (
      select 1
      from public.rooms
      where id = room_shared_resources.room_id
        and host_id = auth.uid()
    )
  );

drop policy if exists room_shared_resources_update_owner on public.room_shared_resources;
create policy room_shared_resources_update_owner on public.room_shared_resources
  for update using (
    auth.uid() = user_id or exists (
      select 1
      from public.rooms
      where id = room_shared_resources.room_id
        and host_id = auth.uid()
    )
  );

drop policy if exists room_shared_resources_delete_owner on public.room_shared_resources;
create policy room_shared_resources_delete_owner on public.room_shared_resources
  for delete using (
    auth.uid() = user_id or exists (
      select 1
      from public.rooms
      where id = room_shared_resources.room_id
        and host_id = auth.uid()
    )
  );

drop trigger if exists room_shared_resources_updated_at on public.room_shared_resources;
create trigger room_shared_resources_updated_at
  before update on public.room_shared_resources
  for each row
  execute function public.handle_updated_at();

insert into storage.buckets (id, name, public)
values ('room-shared-assets', 'room-shared-assets', false)
on conflict (id) do update
set public = excluded.public;

drop policy if exists room_shared_assets_select on storage.objects;
create policy room_shared_assets_select on storage.objects
  for select using (
    bucket_id = 'room-shared-assets' and (
      exists (
        select 1
        from public.room_members
        where room_id = split_part(name, '/', 1)::uuid
          and user_id = auth.uid()
      ) or exists (
        select 1
        from public.rooms
        where id = split_part(name, '/', 1)::uuid
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists room_shared_assets_insert on storage.objects;
create policy room_shared_assets_insert on storage.objects
  for insert with check (
    bucket_id = 'room-shared-assets'
    and auth.uid() = owner
    and (
      exists (
        select 1
        from public.room_members
        where room_id = split_part(name, '/', 1)::uuid
          and user_id = auth.uid()
      ) or exists (
        select 1
        from public.rooms
        where id = split_part(name, '/', 1)::uuid
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists room_shared_assets_update on storage.objects;
create policy room_shared_assets_update on storage.objects
  for update using (
    bucket_id = 'room-shared-assets'
    and (
      auth.uid() = owner
      or exists (
        select 1
        from public.rooms
        where id = split_part(name, '/', 1)::uuid
          and host_id = auth.uid()
      )
    )
  );

drop policy if exists room_shared_assets_delete on storage.objects;
create policy room_shared_assets_delete on storage.objects
  for delete using (
    bucket_id = 'room-shared-assets'
    and (
      auth.uid() = owner
      or exists (
        select 1
        from public.rooms
        where id = split_part(name, '/', 1)::uuid
          and host_id = auth.uid()
      )
    )
  );
