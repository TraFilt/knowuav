-- Know UAV — automatic emails (welcome, account activated, receipt rejected + admin alert).
-- Run once in Supabase → SQL Editor, AFTER deploying the "send-email" Edge Function. Safe to re-run.
create extension if not exists pg_net with schema extensions;

create or replace function public.ku_send_email(payload jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url     := 'https://tjkrscsesdsfhjosrirl.supabase.co/functions/v1/send-email',
    body    := payload,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRqa3JzY3Nlc2RzZmhqb3NyaXJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE4OTMzNjgsImV4cCI6MjEwNzQ2OTM2OH0.DICIsSoBhzZTSM5jreDdT92vvVgTI6mb3pi-D_ZNQhc',
      'x-hook-secret', 'PUT_YOUR_HOOK_SECRET_HERE'),
    timeout_milliseconds := 10000);
exception when others then
  raise warning 'ku_send_email failed: %', sqlerrm;  -- never block signup or payment
end $$;
revoke all on function public.ku_send_email(jsonb) from public, anon, authenticated;

-- 1) welcome email on signup
create or replace function public.ku_mail_welcome() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email is not null then
    perform public.ku_send_email(jsonb_build_object('type','welcome','email',new.email,'name',new.full_name));
  end if;
  return new;
end $$;
drop trigger if exists ku_mail_welcome on public.profiles;
create trigger ku_mail_welcome after insert on public.profiles
  for each row execute function public.ku_mail_welcome();

-- 2) account activated (to the user) + new receipt alert (to you)
create or replace function public.ku_mail_receipt() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr record;
begin
  select email, full_name into pr from public.profiles where id = new.user_id;
  if pr.email is not null then
    perform public.ku_send_email(jsonb_build_object('type','receipt','email',pr.email,'name',pr.full_name,
      'id',new.id,'amount',new.amount,'sender',new.sender_name));
  end if;
  return new;
end $$;
drop trigger if exists ku_mail_receipt on public.payments;
create trigger ku_mail_receipt after insert on public.payments
  for each row execute function public.ku_mail_receipt();

-- 3) receipt rejected → account blocked
create or replace function public.ku_mail_rejected() returns trigger
language plpgsql security definer set search_path = public as $$
declare pr record;
begin
  if new.status = 'rejected' and old.status is distinct from 'rejected' then
    select email, full_name into pr from public.profiles where id = new.user_id;
    if pr.email is not null then
      perform public.ku_send_email(jsonb_build_object('type','rejected','email',pr.email,'name',pr.full_name,
        'id',new.id,'note',new.note));
    end if;
  end if;
  return new;
end $$;
drop trigger if exists ku_mail_rejected on public.payments;
create trigger ku_mail_rejected after update on public.payments
  for each row execute function public.ku_mail_rejected();

-- Test (optional): replace with your email, run, and check your inbox.
-- select public.ku_send_email('{"type":"welcome","email":"TraFilt.store@gmail.com","name":"تجربة"}');
