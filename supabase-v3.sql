-- À lancer dans SQL Editor (après les autres).
-- 1) Il faut un compte pour signaler
drop policy if exists "envoi" on reports;
create policy "envoi" on reports for insert with check (auth.uid() is not null);

-- 2) Lecture : gratuit = blocus/manif avec 10 min de retard ; Police réservée aux Pro ; Pro = tout en direct
drop policy if exists "lecture_pro" on reports;
create policy "lecture_pro" on reports for select using (
  updated > now() - interval '24 hours' and (
    user_id = auth.uid()
    or (type <> 'police' and updated < now() - interval '10 minutes')
    or exists (select 1 from subscriptions s where s.user_id = auth.uid() and s.status = 'active' and (s.until is null or s.until > now()))));

-- 3) Type « police » accepté
alter table reports drop constraint if exists reports_type_check;
alter table reports add constraint reports_type_check check (type in ('blocus','manif','aide','rdv','police'));
