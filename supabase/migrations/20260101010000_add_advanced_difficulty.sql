-- Migration: Add 'Advanced' to question_difficulty enum

DO $$
BEGIN
  ALTER TYPE public.question_difficulty ADD VALUE 'Advanced';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
