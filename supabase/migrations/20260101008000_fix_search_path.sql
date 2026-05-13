-- Fix WARN: function_search_path_mutable
-- Pin search_path on functions that were missing it.

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.get_server_time()
returns timestamptz
language sql
security definer
set search_path = public
as $$
  select now();
$$;
