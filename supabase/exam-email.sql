-- Know UAV — "exam practice" announcement email to every account (activated or not). Run after promo-email.sql. Safe to re-run.
create or replace function public.ku_all_targets(p_campaign text)
returns table (id uuid, email text, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name
    from public.profiles p
    left join public.email_prefs e on e.user_id = p.id
   where p.email is not null and p.email like '%@%'
     and not p.blocked and not p.is_admin
     and e.unsubscribed_at is null
     and not exists (select 1 from public.promo_sends s where s.campaign = p_campaign and s.user_id = p.id)
   order by p.created_at desc
$$;
revoke all on function public.ku_all_targets(text) from public, anon, authenticated;

drop function if exists public.admin_promo_stats(text);
create or replace function public.admin_promo_stats(p_campaign text, p_kind text default 'promo')
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'remaining', case when p_kind = 'exam' then (select count(*) from public.ku_all_targets(p_campaign))
                      else (select count(*) from public.ku_promo_targets(p_campaign)) end,
    'sent', (select count(*) from public.promo_sends where campaign = p_campaign),
    'sent_today', (select count(*) from public.promo_sends where sent_at > now() - interval '24 hours'),
    'unsubscribed', (select count(*) from public.email_prefs where unsubscribed_at is not null),
    'activated_after', (select count(*) from public.promo_sends s join public.profiles p on p.id = s.user_id
                         where s.campaign = p_campaign and p.active_until > s.sent_at));
end $$;
grant execute on function public.admin_promo_stats(text, text) to authenticated;

drop function if exists public.admin_promo_send(text, int, text, boolean);
create or replace function public.admin_promo_send(p_campaign text, p_limit int, p_code text default null, p_test boolean default false, p_kind text default 'promo')
returns int language plpgsql security definer set search_path = public as $$
declare items jsonb := '[]'::jsonb; r record; n int := 0; me record; code text := nullif(upper(trim(coalesce(p_code, ''))), '');
        kind text := case when p_kind = 'exam' then 'exam' else 'promo' end;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if coalesce(trim(p_campaign), '') = '' then raise exception 'campaign required'; end if;
  if code is not null and public.check_promo(code) is null then raise exception 'bad code'; end if;
  if p_test then
    select id, email, full_name into me from public.profiles where id = auth.uid();
    insert into public.email_prefs (user_id) values (me.id) on conflict do nothing;
    items := jsonb_build_array(jsonb_build_object('email', me.email, 'name', me.full_name,
      'token', (select token from public.email_prefs where user_id = me.id)));
    n := 1;
  else
    for r in select * from (select * from public.ku_all_targets(p_campaign) where kind = 'exam'
                            union all
                            select * from public.ku_promo_targets(p_campaign) where kind = 'promo') t
             limit greatest(1, least(coalesce(p_limit, 50), 100)) loop
      insert into public.email_prefs (user_id) values (r.id) on conflict do nothing;
      items := items || jsonb_build_object('email', r.email, 'name', r.full_name,
        'token', (select token from public.email_prefs where user_id = r.id));
      insert into public.promo_sends (campaign, user_id) values (p_campaign, r.id) on conflict do nothing;
      n := n + 1;
    end loop;
  end if;
  if n > 0 then
    perform public.ku_send_email(jsonb_build_object('type', kind, 'items', items, 'code', code,
      'price', public.check_promo(coalesce(code, '')), 'base', public.current_price()));
  end if;
  return n;
end $$;
grant execute on function public.admin_promo_send(text, int, text, boolean, text) to authenticated;
