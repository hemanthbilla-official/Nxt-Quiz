create table if not exists public.app_controls (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid null references public.profiles(id) on delete set null
);

alter table public.app_controls enable row level security;

drop policy if exists app_controls_select_admin on public.app_controls;
drop policy if exists app_controls_update_admin on public.app_controls;

create policy app_controls_select_admin
on public.app_controls
for select
using (public.is_admin());

create policy app_controls_update_admin
on public.app_controls
for all
using (public.is_admin())
with check (public.is_admin());

insert into public.app_controls (key, value)
values (
  'exam_controls',
  '{
    "proctoringEnabled": true,
    "tabSwitchWarningEnabled": true,
    "fullscreenRequired": true,
    "copyPasteBlocked": true,
    "rightClickBlocked": true,
    "questionNavigatorEnabled": true,
    "bookmarksEnabled": true,
    "skipEnabled": true,
    "clearAnswerEnabled": true,
    "themeToggleEnabled": true,
    "codeRunTestsEnabled": true,
    "codePreviewEnabled": true,
    "codeFormatEnabled": true,
    "codeConsoleEnabled": true,
    "codeFileActionsEnabled": true,
    "codeZoomEnabled": true
  }'::jsonb
)
on conflict (key) do nothing;
