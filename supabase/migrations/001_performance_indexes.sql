-- Performance Optimization Indexes
-- Run this in Supabase SQL Editor

-- Critical indexes for exam operations
CREATE INDEX IF NOT EXISTS idx_attempts_exam_id ON attempts(exam_id);
CREATE INDEX IF NOT EXISTS idx_attempts_user_id ON attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_attempts_status ON attempts(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attempts_exam_user ON attempts(exam_id, user_id);

-- Attempt answers indexes
CREATE INDEX IF NOT EXISTS idx_attempt_answers_attempt_id ON attempt_answers(attempt_id);
CREATE INDEX IF NOT EXISTS idx_attempt_answers_question_id ON attempt_answers(question_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attempt_answers_composite ON attempt_answers(attempt_id, question_id);

-- Exam participants indexes
CREATE INDEX IF NOT EXISTS idx_exam_participants_exam_id ON exam_participants(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_participants_user_id ON exam_participants(user_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_exam_participants_exam_user ON exam_participants(exam_id, user_id);

-- Exam questions index
CREATE INDEX IF NOT EXISTS idx_exam_questions_exam_id ON exam_questions(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_question_id ON exam_questions(question_id);
CREATE INDEX IF NOT EXISTS idx_exam_questions_position ON exam_questions(exam_id, position);

-- Partial index for active attempts (most queried)
CREATE INDEX IF NOT EXISTS idx_attempts_active ON attempts(exam_id) WHERE status = 'active';

-- Composite index for exam session queries
CREATE INDEX IF NOT EXISTS idx_exam_session_lookup ON attempts(exam_id, user_id, status);

-- Index for analytics aggregation
CREATE INDEX IF NOT EXISTS idx_attempts_submitted ON attempts(exam_id, status) WHERE status = 'submitted';

-- Questions table indexes
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON questions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(topic);

-- Profiles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- Exam events for audit trail
CREATE INDEX IF NOT EXISTS idx_exam_events_exam_id ON exam_events(exam_id);
CREATE INDEX IF NOT EXISTS idx_exam_events_created_at ON exam_events(created_at);

-- Analyze tables to update statistics
ANALYZE attempts;
ANALYZE attempt_answers;
ANALYZE exam_participants;
ANALYZE exam_questions;