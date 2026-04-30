CREATE OR REPLACE FUNCTION public.complete_onboarding(p_student_college_id text)
RETURNS public.profiles
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_profile public.profiles;
  v_student_college_id text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_student_college_id := upper(trim(p_student_college_id));

  IF length(v_student_college_id) < 3 OR length(v_student_college_id) > 64 THEN
    RAISE EXCEPTION 'Student College ID must be between 3 and 64 characters';
  END IF;

  IF v_student_college_id !~ '^N24H01[AB][0-9]{4}$' THEN
    RAISE EXCEPTION 'Invalid student college ID format';
  END IF;

  UPDATE public.profiles
  SET student_college_id = v_student_college_id,
      onboarded_at = coalesce(onboarded_at, now())
  WHERE id = auth.uid()
  RETURNING * INTO v_profile;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Profile not found';
  END IF;

  RETURN v_profile;
END;
$$;
