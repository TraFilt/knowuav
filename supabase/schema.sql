-- =====================================================================
-- Know UAV — database schema. Paste the whole file into Supabase → SQL Editor → Run.
-- Safe to re-run.
-- =====================================================================

-- ---------- profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text,
  full_name text,
  created_at timestamptz not null default now(),
  active_until timestamptz,
  blocked boolean not null default false,
  is_admin boolean not null default false
);
alter table public.profiles enable row level security;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false)
$$;

create or replace function public.has_access() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select (not blocked) and active_until is not null and active_until > now()
                   from public.profiles where id = auth.uid()), false)
$$;

drop policy if exists "profiles read own or admin" on public.profiles;
create policy "profiles read own or admin" on public.profiles
  for select using (auth.uid() = id or public.is_admin());
-- no insert/update policies: rows are created by trigger and changed only through functions below

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email,
          coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- settings (bank details, price) ----------
create table if not exists public.app_settings (
  key text primary key,
  value text not null default ''
);
alter table public.app_settings enable row level security;
drop policy if exists "settings public read" on public.app_settings;
create policy "settings public read" on public.app_settings for select using (true);
drop policy if exists "settings admin write" on public.app_settings;
create policy "settings admin write" on public.app_settings for all
  using (public.is_admin()) with check (public.is_admin());

insert into public.app_settings (key, value) values
  ('price', '25'),
  ('bank_name', ''),
  ('iban', ''),
  ('account_name', ''),
  ('stcpay', ''),
  ('pay_note', 'اكتب بريدك المسجّل في خانة الملاحظات عند التحويل إن أمكن.')
on conflict (key) do nothing;

-- ---------- lessons ----------
create table if not exists public.lessons (
  id text primary key,
  level int not null,
  ord int not null,
  title text not null,
  hook text,
  mins int,
  is_free boolean not null default false,
  body jsonb,
  scenes jsonb,
  quiz jsonb,
  audio_url text
);
alter table public.lessons enable row level security;
drop policy if exists "lessons read" on public.lessons;
create policy "lessons read" on public.lessons for select
  using ((is_free and auth.uid() is not null) or public.has_access() or public.is_admin());

-- catalogue (titles only) for any signed-in user
create or replace function public.lesson_catalog()
returns table (id text, level int, ord int, title text, hook text, mins int, is_free boolean)
language sql stable security definer set search_path = public as $$
  select id, level, ord, title, hook, mins, is_free from public.lessons
  where auth.uid() is not null order by level, ord
$$;

create table if not exists public.levels (
  id int primary key, title text, en text, descr text
);
alter table public.levels enable row level security;
drop policy if exists "levels read" on public.levels;
create policy "levels read" on public.levels for select using (true);

-- ---------- glossary ----------
create table if not exists public.glossary (
  id serial primary key, term text, ar text, def text
);
alter table public.glossary enable row level security;
drop policy if exists "glossary read" on public.glossary;
create policy "glossary read" on public.glossary for select
  using (public.has_access() or public.is_admin());

-- ---------- progress & simulator scores ----------
create table if not exists public.progress (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  lesson_id text not null,
  score int not null default 0,
  total int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
alter table public.progress enable row level security;
drop policy if exists "progress own" on public.progress;
create policy "progress own" on public.progress for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table if not exists public.sim_scores (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  mission text not null,
  best_time real not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, mission)
);
alter table public.sim_scores enable row level security;
drop policy if exists "sim own" on public.sim_scores;
create policy "sim own" on public.sim_scores for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- payments (receipts) ----------
create table if not exists public.payments (
  id bigserial primary key,
  user_id uuid not null references auth.users on delete cascade,
  receipt_path text not null unique,
  sender_name text,
  amount numeric,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  note text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create index if not exists payments_status_idx on public.payments (status, created_at desc);
alter table public.payments enable row level security;
drop policy if exists "payments read own or admin" on public.payments;
create policy "payments read own or admin" on public.payments for select
  using (auth.uid() = user_id or public.is_admin());

-- receipt storage bucket (private)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 5242880,
        array['image/jpeg','image/png','image/webp','image/heic','application/pdf'])
on conflict (id) do nothing;

drop policy if exists "receipts upload own" on storage.objects;
create policy "receipts upload own" on storage.objects for insert to authenticated
  with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "receipts read own or admin" on storage.objects;
create policy "receipts read own or admin" on storage.objects for select to authenticated
  using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

-- user submits a receipt → instant 1-year access, admin reviews later
create or replace function public.submit_receipt(p_path text, p_sender text)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles; until timestamptz; price numeric;
begin
  if uid is null then raise exception 'not signed in'; end if;
  select * into p from public.profiles where id = uid;
  if p.blocked then raise exception 'account blocked'; end if;
  if split_part(p_path, '/', 1) <> uid::text then raise exception 'bad path'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'receipts' and name = p_path) then
    raise exception 'receipt not found';
  end if;
  if exists (select 1 from public.payments where user_id = uid and status = 'pending'
             and created_at > now() - interval '10 minutes') then
    raise exception 'already submitted';
  end if;
  select value::numeric into price from public.app_settings where key = 'price';
  insert into public.payments (user_id, receipt_path, sender_name, amount)
  values (uid, p_path, left(coalesce(p_sender, ''), 120), price);
  update public.profiles
     set active_until = greatest(coalesce(active_until, now()), now()) + interval '365 days'
   where id = uid
  returning active_until into until;
  return until;
end $$;

-- admin: approve / reject (reject = block account and remove access)
create or replace function public.admin_review(p_id bigint, p_approve boolean, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.payments
     set status = case when p_approve then 'approved' else 'rejected' end,
         note = p_note, reviewed_at = now()
   where id = p_id returning user_id into uid;
  if not p_approve then
    update public.profiles set blocked = true, active_until = null where id = uid;
  end if;
end $$;

create or replace function public.admin_set_blocked(p_user uuid, p_blocked boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set blocked = p_blocked where id = p_user;
end $$;

create or replace function public.admin_grant(p_user uuid, p_days int)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles
     set active_until = greatest(coalesce(active_until, now()), now()) + make_interval(days => p_days),
         blocked = false
   where id = p_user;
end $$;

create or replace function public.admin_stats()
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then json_build_object(
    'users', (select count(*) from public.profiles),
    'active', (select count(*) from public.profiles where active_until > now() and not blocked),
    'pending', (select count(*) from public.payments where status = 'pending'),
    'blocked', (select count(*) from public.profiles where blocked)
  ) end
$$;

grant execute on function public.lesson_catalog, public.submit_receipt, public.has_access, public.is_admin,
  public.admin_review, public.admin_set_blocked, public.admin_grant, public.admin_stats to authenticated;

-- ---------- lesson narration audio (public read) ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('audio', 'audio', true, 10485760, array['audio/mpeg','audio/mp3'])
on conflict (id) do nothing;

drop policy if exists "audio public read" on storage.objects;
create policy "audio public read" on storage.objects for select
  using (bucket_id = 'audio');
-- one-time import window for the narration files; closes automatically on 15 Oct 2026
drop policy if exists "audio import window" on storage.objects;
create policy "audio import window" on storage.objects for insert to anon, authenticated
  with check (bucket_id = 'audio' and name ~ '^[1-4]-[1-6]\.mp3$' and now() < timestamptz '2026-10-15 00:00+03');
drop policy if exists "audio admin write" on storage.objects;
create policy "audio admin write" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio' and public.is_admin());
