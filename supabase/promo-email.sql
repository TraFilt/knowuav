-- Know UAV — promotional email to accounts that have not activated. Run in Supabase → SQL Editor. Safe to re-run.
-- Needs public.ku_send_email (supabase/emails.sql) and the send-email Edge Function with the "promo" type.
-- The admin panel ("الإيميلات" tab) sends in batches; every email has a one-click unsubscribe link.

create table if not exists public.email_prefs (
  user_id uuid primary key references auth.users on delete cascade,
  token uuid not null unique default gen_random_uuid(),
  unsubscribed_at timestamptz
);
alter table public.email_prefs enable row level security;
drop policy if exists "email_prefs admin read" on public.email_prefs;
create policy "email_prefs admin read" on public.email_prefs for select using (public.is_admin());

create table if not exists public.promo_sends (
  campaign text not null,
  user_id uuid not null references auth.users on delete cascade,
  sent_at timestamptz not null default now(),
  primary key (campaign, user_id)
);
alter table public.promo_sends enable row level security;
drop policy if exists "promo_sends admin read" on public.promo_sends;
create policy "promo_sends admin read" on public.promo_sends for select using (public.is_admin());

-- who is eligible: has an email, not activated, not blocked, not unsubscribed, not sent this campaign yet
create or replace function public.ku_promo_targets(p_campaign text)
returns table (id uuid, email text, full_name text)
language sql stable security definer set search_path = public as $$
  select p.id, p.email, p.full_name
    from public.profiles p
    left join public.email_prefs e on e.user_id = p.id
   where p.email is not null and p.email like '%@%'
     and not p.blocked and not p.is_admin
     and (p.active_until is null or p.active_until < now())
     and e.unsubscribed_at is null
     and not exists (select 1 from public.promo_sends s where s.campaign = p_campaign and s.user_id = p.id)
   order by p.created_at desc
$$;
revoke all on function public.ku_promo_targets(text) from public, anon, authenticated;

create or replace function public.admin_promo_stats(p_campaign text)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  return jsonb_build_object(
    'remaining', (select count(*) from public.ku_promo_targets(p_campaign)),
    'sent', (select count(*) from public.promo_sends where campaign = p_campaign),
    'sent_today', (select count(*) from public.promo_sends where sent_at > now() - interval '24 hours'),
    'unsubscribed', (select count(*) from public.email_prefs where unsubscribed_at is not null),
    'activated_after', (select count(*) from public.promo_sends s join public.profiles p on p.id = s.user_id
                         where s.campaign = p_campaign and p.active_until > s.sent_at));
end $$;
grant execute on function public.admin_promo_stats(text) to authenticated;

-- send one batch (max 100 = one Resend batch call). p_test = only to the admin's own email, nothing recorded.
create or replace function public.admin_promo_send(p_campaign text, p_limit int, p_code text default null, p_test boolean default false)
returns int language plpgsql security definer set search_path = public as $$
declare items jsonb := '[]'::jsonb; r record; n int := 0; me record; code text := nullif(upper(trim(coalesce(p_code, ''))), '');
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
    for r in select * from public.ku_promo_targets(p_campaign) limit greatest(1, least(coalesce(p_limit, 50), 100)) loop
      insert into public.email_prefs (user_id) values (r.id) on conflict do nothing;
      items := items || jsonb_build_object('email', r.email, 'name', r.full_name,
        'token', (select token from public.email_prefs where user_id = r.id));
      insert into public.promo_sends (campaign, user_id) values (p_campaign, r.id) on conflict do nothing;
      n := n + 1;
    end loop;
  end if;
  if n > 0 then
    perform public.ku_send_email(jsonb_build_object('type', 'promo', 'items', items, 'code', code,
      'price', public.check_promo(coalesce(code, '')), 'base', public.current_price()));
  end if;
  return n;
end $$;
grant execute on function public.admin_promo_send(text, int, text, boolean) to authenticated;

-- one-click unsubscribe from the link in the email (anyone holding the token)
create or replace function public.email_unsubscribe(p_token uuid)
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.email_prefs set unsubscribed_at = coalesce(unsubscribed_at, now()) where token = p_token;
  return found;
end $$;
grant execute on function public.email_unsubscribe(uuid) to anon, authenticated;
