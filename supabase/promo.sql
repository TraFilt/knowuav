-- Know UAV — discount codes. Run in Supabase → SQL Editor. Safe to re-run.
-- Codes are managed from the admin panel (settings tab). Users enter a code on the payment page.
create table if not exists public.promo_codes (
  code text primary key check (code = upper(code) and length(code) between 3 and 30),
  price numeric not null check (price >= 0),
  active boolean not null default true,
  max_uses int check (max_uses is null or max_uses > 0),
  uses int not null default 0,
  expires_at timestamptz,
  note text,
  created_at timestamptz not null default now()
);
alter table public.promo_codes enable row level security;
drop policy if exists "promo admin all" on public.promo_codes;
create policy "promo admin all" on public.promo_codes for all
  using (public.is_admin()) with check (public.is_admin());

alter table public.payments add column if not exists promo_code text;

-- price for a code, or null when the code is unknown / off / expired / used up. Never cheaper than the current price.
create or replace function public.check_promo(p_code text) returns numeric
language sql stable security definer set search_path = public as $$
  select least(c.price, public.current_price())
    from public.promo_codes c
   where c.code = upper(trim(p_code)) and c.active
     and (c.expires_at is null or c.expires_at > now())
     and (c.max_uses is null or c.uses < c.max_uses)
$$;
revoke all on function public.check_promo(text) from public;
grant execute on function public.check_promo(text) to authenticated;

drop function if exists public.submit_receipt(text, text);
create or replace function public.submit_receipt(p_path text, p_sender text, p_code text default null)
returns timestamptz language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); p public.profiles; until timestamptz; price numeric; v_code text := nullif(upper(trim(coalesce(p_code, ''))), ''); cp numeric;
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
  if v_code is not null then
    cp := public.check_promo(v_code);
    if cp is null then raise exception 'bad code'; end if;
    price := cp;
    update public.promo_codes set uses = uses + 1 where promo_codes.code = v_code;
  end if;
  insert into public.payments (user_id, receipt_path, sender_name, amount, promo_code)
  values (uid, p_path, left(coalesce(p_sender, ''), 120), price, v_code);
  update public.profiles
     set active_until = timestamptz '2999-12-31'  -- one-time payment: permanent activation
   where id = uid
  returning active_until into until;
  return until;
end $$;
grant execute on function public.submit_receipt(text, text, text) to authenticated;
