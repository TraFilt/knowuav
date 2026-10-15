-- Know UAV — limited-time offer support. Run in Supabase → SQL Editor. Safe to re-run.
-- The offer is active while now() < offer_until and 0 < offer_price < price. Edit both from the admin settings tab.
insert into public.app_settings (key, value) values
  ('offer_price', '15'), ('offer_until', '2026-10-16T02:00:00+03:00')
on conflict (key) do update set value = excluded.value;

create or replace function public.current_price() returns numeric
language sql stable security definer set search_path = public as $$
  with s as (select
    (select nullif(value, '')::numeric from public.app_settings where key = 'price') as base,
    (select nullif(value, '')::numeric from public.app_settings where key = 'offer_price') as op,
    (select nullif(value, '')::timestamptz from public.app_settings where key = 'offer_until') as ou)
  select case when op > 0 and op < base and ou > now() then op else base end from s
$$;
grant execute on function public.current_price() to anon, authenticated;

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
  price := public.current_price();
  insert into public.payments (user_id, receipt_path, sender_name, amount)
  values (uid, p_path, left(coalesce(p_sender, ''), 120), price);
  update public.profiles
     set active_until = timestamptz '2999-12-31'  -- one-time payment: permanent activation
   where id = uid
  returning active_until into until;
  return until;
end $$;
