-- Performance indexes for query optimization
-- Created for Nxt-Quiz performance optimization

-- ==================== ATTEMPTS TABLE INDEXES ====================

-- Index for fetching attempts by exam_id (most common query pattern)
create index if not exists idx_attempts_exam_id on public.attempts(exam_id);

-- Index for fetching attempts by exam_id and status (analytics, live monitoring)
create index if not exists idx_attempts_exam_status on public.attempts(exam_id, status);

-- Index for fetching attempts by user_id
create index if not exists idx_attempts_user_id on public.attempts(user_id);

-- Index for sorting by score (leaderboard queries)
create index if not exists idx_attempts_score on public.attempts(exam_id, total_score desc nulls last);

-- Index for submitted attempts with score sorting
create index if not exists idx_attempts_submitted on public.attempts(exam_id, status, total_score desc) 
where status = 'submitted';

-- ==================== EXAM_PARTICIPANTS TABLE INDEXES ====================

-- Index for fetching participants by exam_id (live monitoring)
create index if not exists idx_participants_exam_id on public.exam_participants(exam_id);

-- Index for fetching participants by exam_id and status
create index if not exists idx_participants_exam_status on public.exam_participants(exam_id, status);

-- Index for counting active participants (live exam monitoring)
create index if not exists idx_participants_active on public.exam_participants(exam_id, status) 
where status in ('active', 'waiting');

-- ==================== ATTEMPT_ANSWERS TABLE INDEXES ====================

-- Index for fetching answers by attempt_id
create index if not exists idx_answers_attempt_id on public.attempt_answers(attempt_id);

-- Index for fetching answers by question_id (analytics aggregations)
create index if not exists idx_answers_question_id on public.attempt_answers(question_id);

-- Composite index for analytics queries
create index if not exists idx_answers_attempt_question on public.attempt_answers(attempt_id, question_id);

-- ==================== EXAM_QUESTIONS TABLE INDEXES ====================

-- Index for fetching exam questions by exam_id (faster JOINs)
create index if not exists idx_exam_questions_exam_id on public.exam_questions(exam_id);

-- ==================== EXAMS TABLE INDEXES ====================

-- Index for fetching exams by status (admin dashboard)
create index if not exists idx_exams_status on public.exams(status);

-- Index for fetching exams by created_by (admin)
create index if not exists idx_exams_created_by on public.exams(created_by);

-- Index for fetching exams by created_at (sorting)
create index if not exists idx_exams_created_at on public.exams(created_at desc);

-- ==================== ANALYTICS CACHING VIEW ====================

-- Create a materialized view for commonly accessed analytics
-- This can be refreshed periodically instead of computing every time
create materialized view if not exists exam_summary_stats as
select 
    e.id as exam_id,
    e.title,
    e.exam_code,
    e.status,
    e.duration_seconds,
    count(distinct ep.id)::integer as participant_count,
    count(distinct a.id) filter (where a.status = 'submitted')::integer as submitted_count,
    count(distinct a.id) filter (where a.status = 'active')::integer as active_count,
    count(distinct ep.id) filter (where ep.status = 'waiting')::integer as waiting_count,
    coalesce(avg(a.total_score), 0)::numeric(6,2) as avg_score,
    coalesce(max(a.total_score), 0)::numeric(6,2) as max_score,
    sum(a.tab_switch_count)::integer as total_tab_switches
from public.exams e
left join public.exam_participants ep on ep.exam_id = e.id
left join public.attempts a on a.exam_id = e.id
group by e.id, e.title, e.exam_code, e.status, e.duration_seconds;

-- Create index on the materialized view
create unique index if not exists idx_exam_summary_exam_id on exam_summary_stats(exam_id);

-- ==================== CACHE CONTROL ====================

-- Add cache headers to common queries by creating a function
create or replace function public.get_exam_summary(p_exam_id uuid)
returns table (
    participant_count integer,
    submitted_count integer,
    active_count integer,
    waiting_count integer,
    total_tab_switches integer
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        count(distinct ep.id)::integer as participant_count,
        count(distinct a.id) filter (where a.status = 'submitted')::integer as submitted_count,
        count(distinct a.id) filter (where a.status = 'active')::integer as active_count,
        count(distinct ep.id) filter (where ep.status = 'waiting')::integer as waiting_count,
        coalesce(sum(a.tab_switch_count), 0)::integer as total_tab_switches
    from public.exam_participants ep
    left join public.attempts a on a.exam_id = ep.exam_id and a.user_id = ep.user_id
    where ep.exam_id = p_exam_id;
end;
$$;

-- Create function for live stats (optimized single query)
create or replace function public.get_live_exam_stats()
returns table (
    exam_id uuid,
    title text,
    exam_code text,
    status exam_status,
    capacity integer,
    participant_count integer,
    waiting_count integer,
    active_count integer,
    submitted_count integer,
    total_tab_switches bigint,
    duration_seconds integer
)
language plpgsql
security definer
as $$
begin
    return query
    select 
        e.id,
        e.title,
        e.exam_code,
        e.status,
        e.capacity,
        count(distinct ep.id)::integer as participant_count,
        count(distinct ep.id) filter (where ep.status = 'waiting')::integer as waiting_count,
        count(distinct ep.id) filter (where ep.status = 'active')::integer as active_count,
        count(distinct ep.id) filter (where ep.status = 'submitted')::integer as submitted_count,
        coalesce(sum(a.tab_switch_count), 0)::bigint as total_tab_switches,
        e.duration_seconds
    from public.exams e
    left join public.exam_participants ep on ep.exam_id = e.id
    left join public.attempts a on a.exam_id = e.id and a.user_id = ep.user_id
    where e.status in ('waiting', 'in_progress')
    group by e.id, e.title, e.exam_code, e.status, e.capacity, e.duration_seconds
    order by e.created_at desc;
end;
$$;

-- Analyze tables to update statistics (helps query planner)
analyze public.attempts;
analyze public.exam_participants;
analyze public.attempt_answers;
analyze public.exams;
analyze public.exam_questions;