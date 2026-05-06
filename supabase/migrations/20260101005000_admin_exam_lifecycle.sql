-- Centralized, transactional admin exam lifecycle operations.

CREATE OR REPLACE FUNCTION public.admin_start_exam(
  p_exam_id uuid,
  p_admin_user_id uuid
)
RETURNS public.exams
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam public.exams;
  v_started_at timestamptz := now();
  v_closes_at timestamptz;
  v_actor_user_id uuid;
BEGIN
  SELECT *
  INTO v_exam
  FROM public.exams
  WHERE id = p_exam_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Exam not found';
  END IF;

  IF v_exam.status <> 'waiting' THEN
    RAISE EXCEPTION 'Exam must be in waiting status';
  END IF;

  v_closes_at := v_started_at + make_interval(secs => v_exam.duration_seconds);

  UPDATE public.exams
  SET status = 'in_progress',
      starts_at = v_started_at,
      closes_at = v_closes_at
  WHERE id = p_exam_id
  RETURNING * INTO v_exam;

  INSERT INTO public.attempts (
    exam_id,
    user_id,
    server_started_at,
    server_due_at,
    max_score,
    status
  )
  SELECT
    p_exam_id,
    ep.user_id,
    v_started_at,
    v_closes_at,
    COALESCE(SUM(eq.points), 0),
    'active'::participant_status
  FROM public.exam_participants ep
  LEFT JOIN public.exam_questions eq ON eq.exam_id = ep.exam_id
  WHERE ep.exam_id = p_exam_id
    AND ep.status = 'waiting'
  GROUP BY ep.user_id
  ON CONFLICT (exam_id, user_id) DO UPDATE
    SET server_started_at = EXCLUDED.server_started_at,
        server_due_at = EXCLUDED.server_due_at,
        max_score = EXCLUDED.max_score,
        status = 'active';

  UPDATE public.exam_participants
  SET status = 'active',
      started_at = v_started_at
  WHERE exam_id = p_exam_id
    AND status = 'waiting';

  SELECT p_admin_user_id
  INTO v_actor_user_id
  WHERE EXISTS (
    SELECT 1 FROM public.profiles WHERE id = p_admin_user_id
  );

  INSERT INTO public.exam_events (exam_id, actor_user_id, event_type, payload)
  VALUES (
    p_exam_id,
    v_actor_user_id,
    'exam_started',
    jsonb_build_object('starts_at', v_started_at, 'closes_at', v_closes_at)
  );

  RETURN v_exam;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_start_exam(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_start_exam(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.admin_start_exam(uuid, uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.admin_start_exam(uuid, uuid) TO service_role;
