-- ============================================================================
-- Migration: Add Programming Question Support
-- ============================================================================
-- This migration extends the quiz schema to support programming challenges
-- (JavaScript function + React component) alongside existing MCQ questions.
--
-- IMPORTANT: Run this AFTER the base schema (react_quiz_schema.sql) exists.
-- Safe to re-run: uses IF NOT EXISTS / IF EXISTS guards everywhere.
-- ============================================================================

-- --------------------------------------------------------------------------
-- 1. Add programming-specific columns to the questions table
-- --------------------------------------------------------------------------

ALTER TABLE public.questions
  ADD COLUMN IF NOT EXISTS starter_code text,
  ADD COLUMN IF NOT EXISTS function_name text,
  ADD COLUMN IF NOT EXISTS challenge_mode text DEFAULT 'function',
  ADD COLUMN IF NOT EXISTS test_cases jsonb,
  ADD COLUMN IF NOT EXISTS language text DEFAULT 'javascript';

-- --------------------------------------------------------------------------
-- 2. Relax correct_option_id for programming questions
-- --------------------------------------------------------------------------
-- The existing inline CHECK constraint has an auto-generated name.
-- PostgreSQL names inline column checks as: {table}_{column}_check
-- so it should be: questions_correct_option_id_check
--
-- We drop it by the auto-generated name AND a common alternative format,
-- then re-create with programming-aware logic.

ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_correct_option_id_check;

-- Also try the format without underscores in case of different PG behavior
ALTER TABLE public.questions
  DROP CONSTRAINT IF EXISTS questions_correct_option_id_check1;

-- Make the column nullable (programming questions have no correct MCQ option)
ALTER TABLE public.questions
  ALTER COLUMN correct_option_id DROP NOT NULL;

-- Re-add constraint: programming questions must have NULL correct_option_id,
-- MCQ questions must have A/B/C/D
ALTER TABLE public.questions
  ADD CONSTRAINT questions_correct_option_id_check
  CHECK (
    (question_type = 'programming' AND correct_option_id IS NULL)
    OR (question_type <> 'programming' AND correct_option_id IN ('A', 'B', 'C', 'D'))
  );

-- --------------------------------------------------------------------------
-- 3. Relax options column for programming questions
-- --------------------------------------------------------------------------
-- MCQ questions require options (jsonb not null).
-- Programming questions don't have MCQ options.
-- We make options nullable and store an empty array '[]' for programming.

ALTER TABLE public.questions
  ALTER COLUMN options DROP NOT NULL;

-- --------------------------------------------------------------------------
-- 4. Relax explanation column for programming questions
-- --------------------------------------------------------------------------
-- Programming questions may not have a text explanation.

ALTER TABLE public.questions
  ALTER COLUMN explanation DROP NOT NULL;

-- --------------------------------------------------------------------------
-- 5. Add code answer columns to attempt_answers
-- --------------------------------------------------------------------------

ALTER TABLE public.attempt_answers
  ADD COLUMN IF NOT EXISTS code_answer text,
  ADD COLUMN IF NOT EXISTS code_language text DEFAULT 'javascript',
  ADD COLUMN IF NOT EXISTS last_run_results jsonb,
  ADD COLUMN IF NOT EXISTS last_run_at timestamptz,
  ADD COLUMN IF NOT EXISTS test_pass_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS test_fail_count integer DEFAULT 0;

-- --------------------------------------------------------------------------
-- 6. Update the student_exam_questions view
-- --------------------------------------------------------------------------
-- Expose new programming fields to the student during exam.
-- Note: correct_option_id is intentionally NOT included (never sent to students).

DROP VIEW IF EXISTS public.student_exam_questions;

CREATE OR REPLACE VIEW public.student_exam_questions 
WITH (security_invoker = true)
AS
SELECT
  eq.exam_id,
  eq.position,
  eq.points,
  q.id,
  q.topic,
  q.difficulty,
  q.question_type,
  q.question,
  q.code_snippet,
  q.options,
  q.tags,
  q.starter_code,
  q.function_name,
  q.challenge_mode,
  q.test_cases,
  q.language
FROM public.exam_questions eq
JOIN public.questions q ON q.id = eq.question_id
WHERE public.is_admin() OR public.is_exam_participant(eq.exam_id);

-- --------------------------------------------------------------------------
-- 7. Update the exam_question_analytics view
-- --------------------------------------------------------------------------
-- Handle NULL correct_option_id for programming questions.
-- Programming questions use test_pass_count instead of selected_option_id matching.
--
-- IMPORTANT:
-- PostgreSQL cannot use CREATE OR REPLACE VIEW when the new view inserts or
-- renames columns before existing columns. The programming-aware view adds
-- question_type before the old submitted_attempts column, so we must drop and
-- recreate the view instead of replacing it in place.

DROP VIEW IF EXISTS public.exam_question_analytics;

CREATE VIEW public.exam_question_analytics 
WITH (security_invoker = true)
AS
SELECT
  e.id AS exam_id,
  q.id AS question_id,
  q.topic,
  q.difficulty,
  q.question_type,
  count(a.id) FILTER (WHERE a.status = 'submitted') AS submitted_attempts,
  -- MCQ: count correct answers
  count(aa.attempt_id) FILTER (
    WHERE q.question_type <> 'programming'
      AND aa.selected_option_id = q.correct_option_id
  ) AS correct_count,
  -- Programming: count fully passing answers (all tests passed)
  count(aa.attempt_id) FILTER (
    WHERE q.question_type = 'programming'
      AND aa.test_fail_count = 0
      AND aa.test_pass_count > 0
  ) AS programming_full_pass_count,
  -- Programming: average pass rate
  ROUND(
    AVG(
      CASE
        WHEN q.question_type = 'programming'
          AND (aa.test_pass_count + aa.test_fail_count) > 0
        THEN 100.0 * aa.test_pass_count / (aa.test_pass_count + aa.test_fail_count)
        ELSE NULL
      END
    ),
    2
  ) AS programming_avg_pass_rate,
  count(aa.attempt_id) FILTER (
    WHERE aa.selected_option_id IS NULL AND aa.is_skipped
  ) AS skipped_count,
  count(aa.attempt_id) FILTER (WHERE aa.is_bookmarked) AS bookmarked_count,
  ROUND(
    100.0 * count(aa.attempt_id) FILTER (
      WHERE q.question_type <> 'programming'
        AND aa.selected_option_id = q.correct_option_id
    )
    / NULLIF(count(a.id) FILTER (WHERE a.status = 'submitted'), 0),
    2
  ) AS correct_percentage
FROM public.exams e
JOIN public.exam_questions eq ON eq.exam_id = e.id
JOIN public.questions q ON q.id = eq.question_id
LEFT JOIN public.attempts a ON a.exam_id = e.id
LEFT JOIN public.attempt_answers aa ON aa.attempt_id = a.id AND aa.question_id = q.id
WHERE public.is_admin()
GROUP BY e.id, q.id, q.topic, q.difficulty, q.question_type;

-- --------------------------------------------------------------------------
-- 8. Update submit_attempt function (safety net)
-- --------------------------------------------------------------------------
-- This function is NOT called by the app (the API route does scoring),
-- but we update it to avoid incorrect results if it's ever called directly.
-- Programming questions are scored as 0 here — real scoring happens in the API.

CREATE OR REPLACE FUNCTION public.submit_attempt(p_attempt_id uuid)
RETURNS public.attempts
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attempt public.attempts;
  v_score numeric(6, 2);
  v_max_score numeric(6, 2);
BEGIN
  SELECT *
  INTO v_attempt
  FROM public.attempts
  WHERE id = p_attempt_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attempt not found';
  END IF;

  IF v_attempt.user_id <> auth.uid() AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  -- Score MCQ questions only; programming questions scored by API route
  SELECT
    COALESCE(SUM(
      CASE
        WHEN q.question_type <> 'programming'
          AND aa.selected_option_id = q.correct_option_id
        THEN eq.points
        WHEN q.question_type = 'programming'
          AND aa.test_pass_count > 0
          AND (aa.test_pass_count + aa.test_fail_count) > 0
        THEN ROUND(eq.points * aa.test_pass_count::numeric / (aa.test_pass_count + aa.test_fail_count), 2)
        ELSE 0
      END
    ), 0),
    COALESCE(SUM(eq.points), 0)
  INTO v_score, v_max_score
  FROM public.exam_questions eq
  JOIN public.questions q ON q.id = eq.question_id
  LEFT JOIN public.attempt_answers aa
    ON aa.question_id = eq.question_id
   AND aa.attempt_id = p_attempt_id
  WHERE eq.exam_id = v_attempt.exam_id;

  UPDATE public.attempts
  SET status = 'submitted',
      submitted_at = COALESCE(submitted_at, now()),
      total_score = v_score,
      max_score = v_max_score
  WHERE id = p_attempt_id
  RETURNING * INTO v_attempt;

  UPDATE public.exam_participants
  SET status = 'submitted',
      submitted_at = v_attempt.submitted_at
  WHERE exam_id = v_attempt.exam_id
    AND user_id = v_attempt.user_id;

  INSERT INTO public.exam_events (exam_id, actor_user_id, event_type, payload)
  VALUES (
    v_attempt.exam_id,
    v_attempt.user_id,
    'attempt_submitted',
    jsonb_build_object('attempt_id', p_attempt_id, 'score', v_score, 'max_score', v_max_score)
  );

  RETURN v_attempt;
END;
$$;

-- ============================================================================
-- Migration complete.
-- Existing MCQ questions and answers are fully backward-compatible.
-- ============================================================================
