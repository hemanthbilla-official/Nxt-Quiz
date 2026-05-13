-- Fix WARN: auth_rls_initplan
-- Wrap auth.uid() in (select ...) so Postgres evaluates it once per query
-- instead of once per row.
--
-- Fix WARN: multiple_permissive_policies on app_controls
-- Merge overlapping permissive policies into a single policy.

-- ============================================================
-- 1. profiles  –  profiles_select_own_or_admin
-- ============================================================
drop policy if exists profiles_select_own_or_admin on public.profiles;
create policy profiles_select_own_or_admin
on public.profiles
for select
using (id = (select auth.uid()) or public.is_admin());

-- ============================================================
-- 2. exam_participants  –  select + update
-- ============================================================
drop policy if exists exam_participants_select_own_or_admin on public.exam_participants;
create policy exam_participants_select_own_or_admin
on public.exam_participants
for select
using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists exam_participants_update_own_presence on public.exam_participants;
create policy exam_participants_update_own_presence
on public.exam_participants
for update
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

-- ============================================================
-- 3. attempts  –  attempts_select_own_or_admin
-- ============================================================
drop policy if exists attempts_select_own_or_admin on public.attempts;
create policy attempts_select_own_or_admin
on public.attempts
for select
using (user_id = (select auth.uid()) or public.is_admin());

-- ============================================================
-- 4. attempt_answers  –  select / insert / update
-- ============================================================
drop policy if exists attempt_answers_select_own_or_admin on public.attempt_answers;
create policy attempt_answers_select_own_or_admin
on public.attempt_answers
for select
using (
  public.is_admin()
  or exists (
    select 1
    from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = (select auth.uid())
  )
);

drop policy if exists attempt_answers_insert_own_before_due on public.attempt_answers;
create policy attempt_answers_insert_own_before_due
on public.attempt_answers
for insert
with check (
  exists (
    select 1
    from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = (select auth.uid())
      and a.status = 'active'
      and now() <= a.server_due_at
  )
);

drop policy if exists attempt_answers_update_own_before_due on public.attempt_answers;
create policy attempt_answers_update_own_before_due
on public.attempt_answers
for update
using (
  exists (
    select 1
    from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = (select auth.uid())
      and a.status = 'active'
      and now() <= a.server_due_at
  )
)
with check (
  exists (
    select 1
    from public.attempts a
    where a.id = attempt_answers.attempt_id
      and a.user_id = (select auth.uid())
      and a.status = 'active'
      and now() <= a.server_due_at
  )
);

-- ============================================================
-- 5. app_controls  –  merge duplicate permissive policies
--    "for all" already covers SELECT, so the separate select
--    policy was redundant and triggered the linter.
-- ============================================================
drop policy if exists app_controls_select_admin on public.app_controls;
drop policy if exists app_controls_update_admin on public.app_controls;

create policy app_controls_admin_all
on public.app_controls
for all
using (public.is_admin())
with check (public.is_admin());
