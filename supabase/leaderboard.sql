-- Know UAV — simulator leaderboard + profile pictures. Run once in Supabase → SQL Editor. Safe to re-run.

-- 1) profile picture + display name
alter table public.profiles add column if not exists avatar_url text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 524288, array['image/webp','image/jpeg','image/png'])
on conflict (id) do update set public = true, file_size_limit = 524288, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "avatars public read" on storage.objects;
create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
drop policy if exists "avatars write own" on storage.objects;
create policy "avatars write own" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars update own" on storage.objects;
create policy "avatars update own" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists "avatars delete own or admin" on storage.objects;
create policy "avatars delete own or admin" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and ((storage.foldername(name))[1] = auth.uid()::text or public.is_admin()));

create or replace function public.set_my_profile(p_name text, p_avatar text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); n text := nullif(btrim(left(coalesce(p_name, ''), 40)), '');
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_avatar is not null and p_avatar <> ''
     and p_avatar not like 'https://tjkrscsesdsfhjosrirl.supabase.co/storage/v1/object/public/avatars/' || uid::text || '/%' then
    raise exception 'bad avatar';
  end if;
  update public.profiles
     set full_name = coalesce(n, full_name),
         avatar_url = case when p_avatar is null then avatar_url when p_avatar = '' then null else p_avatar end
   where id = uid;
end $$;

create or replace function public.admin_clear_avatar(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set avatar_url = null where id = p_user;
end $$;

-- 2) anti-cheat: keep only the best time, and reject impossible times
create or replace function public.sim_scores_guard() returns trigger
language plpgsql as $$
declare minsec real := case new.mission when 'hover' then 5 when 'wind' then 15 when 'box' then 8
                                       when 'gates' then 8 when 'land' then 5 when 'rth' then 5
                                       when 'slalom' then 8 when 'orbit' then 8 when 'low' then 5 when 'pads' then 10 when 'night' then 8 when 'coins' then 30 else 1 end;
begin
  if new.best_time is null or new.best_time < minsec or new.best_time > 3600 then
    raise exception 'invalid time';
  end if;
  if tg_op = 'UPDATE' then
    new.best_time := least(old.best_time, new.best_time);
    if new.best_time = old.best_time then new.updated_at := old.updated_at; end if;
  end if;
  return new;
end $$;
drop trigger if exists sim_scores_guard on public.sim_scores;
create trigger sim_scores_guard before insert or update on public.sim_scores
  for each row execute function public.sim_scores_guard();

-- 3) leaderboard: top players for a mission + the caller's own rank
create or replace function public.sim_leaderboard(p_mission text, p_limit int default 10)
returns table (rank bigint, name text, avatar_url text, best_time real, is_me boolean, total bigint)
language sql stable security definer set search_path = public as $$
  with ranked as (
    select s.user_id, s.best_time,
           rank() over (order by s.best_time asc, s.updated_at asc) as rk,
           count(*) over () as total,
           p.full_name, p.avatar_url
      from public.sim_scores s
      join public.profiles p on p.id = s.user_id
     where s.mission = p_mission and not p.blocked
  )
  select rk,
         coalesce(nullif(split_part(btrim(full_name), ' ', 1), ''), 'طيّار')
           || case when split_part(btrim(full_name), ' ', 2) <> '' then ' ' || left(split_part(btrim(full_name), ' ', 2), 1) || '.' else '' end,
         avatar_url, best_time, user_id = auth.uid(), total
    from ranked
   where rk <= least(greatest(p_limit, 1), 50) or user_id = auth.uid()
   order by rk;
$$;

grant execute on function public.set_my_profile(text, text), public.admin_clear_avatar(uuid),
  public.sim_leaderboard(text, int) to authenticated;
