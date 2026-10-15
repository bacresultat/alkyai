-- 1) ABONNEMENTS
create table if not exists subscriptions(
  user_id uuid primary key references auth.users on delete cascade,
  plan text, status text default 'active', stripe_customer text,
  updated timestamptz default now());
alter table subscriptions enable row level security;
drop policy if exists "mon_abo" on subscriptions;
create policy "mon_abo" on subscriptions for select using (auth.uid() = user_id);

-- 2) SIGNALEMENTS : 24 h max ; gratuit = 10 min de retard ; Pro = direct
drop policy if exists "lecture" on reports;
drop policy if exists "lecture_pro" on reports;
create policy "lecture_pro" on reports for select using (
  updated > now() - interval '24 hours'
  and (updated < now() - interval '10 minutes'
       or exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.status = 'active'))
);

-- 3) ADMIN (remplace par TON e-mail) : voit et supprime tout
drop policy if exists "admin_tout" on reports;
create policy "admin_tout" on reports for all
  using (auth.jwt() ->> 'email' = 'TON@EMAIL.FR')
  with check (auth.jwt() ->> 'email' = 'TON@EMAIL.FR');

-- 4) NETTOYAGE AUTO toutes les 30 min (supprime ce qui a plus de 24 h)
create extension if not exists pg_cron;
select cron.schedule('purge-24h', '*/30 * * * *', $$delete from reports where updated < now() - interval '24 hours'$$);
