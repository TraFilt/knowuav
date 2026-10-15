-- Know UAV — admin dashboard functions. Run once in Supabase → SQL Editor. Safe to re-run.
-- All functions are admin-only (they return null / raise for anyone else).

-- 1) overview: KPIs, last 30 days, lessons and simulator usage
create or replace function public.admin_overview()
returns json language sql stable security definer set search_path = public, auth as $$
  with day0 as (select (now() at time zone 'Asia/Riyadh')::date as d)
  select case when public.is_admin() then json_build_object(
    'users',      (select count(*) from public.profiles),
    'new_today',  (select count(*) from public.profiles, day0 where (created_at at time zone 'Asia/Riyadh')::date = day0.d),
    'new_7d',     (select count(*) from public.profiles where created_at > now() - interval '7 days'),
    'new_30d',    (select count(*) from public.profiles where created_at > now() - interval '30 days'),
    'active',     (select count(*) from public.profiles where active_until > now() and not blocked),
    'blocked',    (select count(*) from public.profiles where blocked),
    'pending',    (select count(*) from public.payments where status = 'pending'),
    'approved',   (select count(*) from public.payments where status = 'approved'),
    'rejected',   (select count(*) from public.payments where status = 'rejected'),
    'revenue',    (select coalesce(sum(amount), 0) from public.payments where status <> 'rejected'),
    'revenue_30d',(select coalesce(sum(amount), 0) from public.payments where status <> 'rejected' and created_at > now() - interval '30 days'),
    'seen_7d',    (select count(*) from auth.users where last_sign_in_at > now() - interval '7 days'),
    'learners',   (select count(distinct user_id) from public.progress),
    'pilots',     (select count(distinct user_id) from public.sim_scores),
    'daily', (select json_agg(json_build_object('d', g.d, 'u', g.u, 'p', g.p) order by g.d) from (
        select s.d::date as d,
          (select count(*) from public.profiles where (created_at at time zone 'Asia/Riyadh')::date = s.d::date) as u,
          (select count(*) from public.payments where status <> 'rejected' and (created_at at time zone 'Asia/Riyadh')::date = s.d::date) as p
        from day0, generate_series(day0.d - 29, day0.d, interval '1 day') as s(d)) g),
    'lessons', (select json_agg(json_build_object('id', l.id, 'title', l.title, 'level', l.level, 'free', l.is_free,
                  'n', coalesce(x.n, 0), 'avg', x.a) order by l.level, l.ord)
                from public.lessons l
                left join (select lesson_id, count(*) as n,
                             round(avg(case when total > 0 then score * 100.0 / total end)) as a
                           from public.progress group by lesson_id) x on x.lesson_id = l.id),
    'missions', (select json_agg(json_build_object('m', mission, 'n', n, 'best', b) order by n desc)
                 from (select mission, count(*) as n, min(best_time) as b from public.sim_scores group by mission) x)
  ) end
$$;

-- 2) users with activity counters and last sign-in
create or replace function public.admin_users()
returns json language sql stable security definer set search_path = public, auth as $$
  select case when public.is_admin() then (select coalesce(json_agg(r order by r.created_at desc), '[]'::json) from (
    select p.id, p.email, p.full_name, p.created_at, p.active_until, p.blocked, p.is_admin, p.avatar_url,
           u.last_sign_in_at as last_seen, u.email_confirmed_at as confirmed,
           coalesce(u.raw_app_meta_data->>'provider', 'email') as provider,
           (select count(*) from public.progress g where g.user_id = p.id) as lessons,
           (select count(*) from public.sim_scores s where s.user_id = p.id) as missions,
           (select count(*) from public.payments y where y.user_id = p.id) as receipts
    from public.profiles p left join auth.users u on u.id = p.id) r) end
$$;

-- 3) one user in detail: lessons, simulator, receipts
create or replace function public.admin_user_detail(p_user uuid)
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then json_build_object(
    'progress', (select coalesce(json_agg(json_build_object('id', g.lesson_id, 'title', coalesce(l.title, g.lesson_id),
                   'score', g.score, 'total', g.total, 'at', g.updated_at) order by g.updated_at desc), '[]'::json)
                 from public.progress g left join public.lessons l on l.id = g.lesson_id where g.user_id = p_user),
    'sim', (select coalesce(json_agg(json_build_object('m', mission, 't', best_time, 'at', updated_at) order by updated_at desc), '[]'::json)
            from public.sim_scores where user_id = p_user),
    'payments', (select coalesce(json_agg(json_build_object('id', id, 'status', status, 'amount', amount, 'sender', sender_name,
                   'path', receipt_path, 'note', note, 'at', created_at, 'reviewed', reviewed_at) order by created_at desc), '[]'::json)
                 from public.payments where user_id = p_user)
  ) end
$$;

-- 4) recent activity feed (signups, receipts, lessons, simulator records)
create or replace function public.admin_activity(p_limit int default 40)
returns json language sql stable security definer set search_path = public as $$
  select case when public.is_admin() then (select coalesce(json_agg(e order by e.at desc), '[]'::json) from (
    select * from (
      (select 'signup'::text as k, p.created_at as at, p.email, p.full_name, null::text as x
         from public.profiles p order by p.created_at desc limit p_limit)
      union all
      (select 'receipt', y.created_at, p.email, p.full_name, y.status
         from public.payments y join public.profiles p on p.id = y.user_id order by y.created_at desc limit p_limit)
      union all
      (select 'lesson', g.updated_at, p.email, p.full_name, coalesce(l.title, g.lesson_id) || ' · ' || g.score || '/' || g.total
         from public.progress g join public.profiles p on p.id = g.user_id
         left join public.lessons l on l.id = g.lesson_id order by g.updated_at desc limit p_limit)
      union all
      (select 'sim', s.updated_at, p.email, p.full_name, s.mission || ' · ' || round(s.best_time::numeric, 1)
         from public.sim_scores s join public.profiles p on p.id = s.user_id order by s.updated_at desc limit p_limit)
    ) a order by at desc limit p_limit) e) end
$$;

-- 5) remove access without blocking (e.g. activated by mistake)
create or replace function public.admin_revoke(p_user uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  update public.profiles set active_until = null where id = p_user;
end $$;

-- 6) reset a user's simulator records (e.g. a suspicious leaderboard time)
create or replace function public.admin_clear_sim(p_user uuid, p_mission text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  delete from public.sim_scores where user_id = p_user and (p_mission is null or mission = p_mission);
end $$;

revoke all on function public.admin_overview(), public.admin_users(), public.admin_user_detail(uuid),
  public.admin_activity(int), public.admin_revoke(uuid), public.admin_clear_sim(uuid, text) from public, anon;
grant execute on function public.admin_overview(), public.admin_users(), public.admin_user_detail(uuid),
  public.admin_activity(int), public.admin_revoke(uuid), public.admin_clear_sim(uuid, text) to authenticated;
