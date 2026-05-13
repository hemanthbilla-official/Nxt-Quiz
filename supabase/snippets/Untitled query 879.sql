-- Run this in your Supabase SQL Editor to fix the foreign key error
-- specifically for local development with auth bypass.

-- 1. Insert dummy admin into auth.users (Internal Supabase Table)
INSERT INTO auth.users (id, email, aud, role, last_sign_in_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'admin@local.test', 
  'authenticated', 
  'authenticated', 
  now(), 
  now(), 
  now(),
  '{}'::jsonb,
  '{"full_name": "Local Administrator"}'::jsonb,
  false,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 2. Insert dummy student into auth.users
INSERT INTO auth.users (id, email, aud, role, last_sign_in_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, email_confirmed_at)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'student@local.test', 
  'authenticated', 
  'authenticated', 
  now(), 
  now(), 
  now(),
  '{}'::jsonb,
  '{"full_name": "Local Student"}'::jsonb,
  false,
  now()
)
ON CONFLICT (id) DO NOTHING;

-- 3. Ensure the profiles exist
INSERT INTO public.profiles (id, email, full_name, role, onboarded_at)
VALUES (
  '00000000-0000-0000-0000-000000000000', 
  'admin@local.test', 
  'Local Administrator', 
  'admin', 
  now()
)
ON CONFLICT (id) DO UPDATE SET role = 'admin';

INSERT INTO public.profiles (id, email, full_name, role, onboarded_at, student_college_id)
VALUES (
  '00000000-0000-0000-0000-000000000001', 
  'student@local.test', 
  'Local Student', 
  'student', 
  now(),
  'N24H01A1234'
)
ON CONFLICT (id) DO NOTHING;

-- 4. Fix the app_controls table to reference profiles instead of auth.users
ALTER TABLE public.app_controls 
DROP CONSTRAINT IF EXISTS app_controls_updated_by_fkey,
ADD CONSTRAINT app_controls_updated_by_fkey 
FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
