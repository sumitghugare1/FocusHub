-- One-time helper script to grant admin role to the configured admin email.
-- Update the email below if you changed ADMIN_LOGIN_EMAIL.

insert into public.profiles (id, email, username, full_name, role)
select
  au.id,
  au.email,
  split_part(au.email, '@', 1) as username,
  'Platform Admin' as full_name,
  'admin'::text as role
from auth.users au
where lower(au.email) = lower('admin@focushub.com')
on conflict (id)
do update set
  email = excluded.email,
  username = excluded.username,
  full_name = excluded.full_name,
  role = 'admin',
  updated_at = now();
