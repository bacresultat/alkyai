-- À lancer APRÈS supabase.sql. Remplace TON@EMAIL.FR (2 endroits marqués) par ton e-mail admin.

-- Espace étudiant : profils
create table if not exists profiles(
  user_id uuid primary key references auth.users on delete cascade,
  pseudo text check (char_length(pseudo) <= 30),
  etab_name text, etab_id text, lat float8, lng float8, city text,
  created timestamptz default now());
alter table profiles enable row level security;
drop policy if exists "profil_lire" on profiles;   create policy "profil_lire" on profiles for select using (auth.uid() = user_id);
drop policy if exists "profil_ecrire" on profiles; create policy "profil_ecrire" on profiles for insert with check (auth.uid() = user_id);
drop policy if exists "profil_maj" on profiles;    create policy "profil_maj" on profiles for update using (auth.uid() = user_id);
drop policy if exists "profil_admin" on profiles;  create policy "profil_admin" on profiles for select using (auth.jwt() ->> 'email' = 'TON@EMAIL.FR');

-- Abonnements gérés à la main (lien de paiement)
alter table subscriptions add column if not exists until timestamptz;
alter table subscriptions add column if not exists email text;
drop policy if exists "abo_admin" on subscriptions;
create policy "abo_admin" on subscriptions for all
  using (auth.jwt() ->> 'email' = 'TON@EMAIL.FR') with check (auth.jwt() ->> 'email' = 'TON@EMAIL.FR');

-- Demandes « j'ai payé »
create table if not exists pay_requests(
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users on delete cascade,
  email text, plan text, done boolean default false, created timestamptz default now());
alter table pay_requests enable row level security;
drop policy if exists "req_envoi" on pay_requests; create policy "req_envoi" on pay_requests for insert with check (auth.uid() = user_id);
drop policy if exists "req_lire" on pay_requests;  create policy "req_lire" on pay_requests for select using (auth.uid() = user_id);
drop policy if exists "req_admin" on pay_requests;
create policy "req_admin" on pay_requests for all
  using (auth.jwt() ->> 'email' = 'TON@EMAIL.FR') with check (auth.jwt() ->> 'email' = 'TON@EMAIL.FR');

-- Signalements : chacun voit les siens ; Pro (non expiré) voit le direct
alter table reports add column if not exists user_id uuid default auth.uid();
drop policy if exists "lecture_pro" on reports;
create policy "lecture_pro" on reports for select using (
  updated > now() - interval '24 hours' and (
    updated < now() - interval '10 minutes' or user_id = auth.uid()
    or exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.status = 'active' and (s.until is null or s.until > now()))));
