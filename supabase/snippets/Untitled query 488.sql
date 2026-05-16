-- Ensure tables are in supabase_realtime for real-time subscriptions
-- This migration is idempotent: it only adds tables that aren't already in the publication

-- Function to add table to publication if not exists
CREATE OR REPLACE FUNCTION ensure_realtime_table(table_name TEXT)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
    AND tablename = table_name
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE table_name;
  END IF;
END;
$$;

-- Enable realtime for exams table
SELECT ensure_realtime_table('exams');

-- Enable realtime for attempts table
SELECT ensure_realtime_table('attempts');

-- Enable realtime for exam_participants table
SELECT ensure_realtime_table('exam_participants');

-- Ensure replica identity is set to FULL for these tables to capture all changes
ALTER TABLE exams REPLICA IDENTITY FULL;
ALTER TABLE attempts REPLICA IDENTITY FULL;
ALTER TABLE exam_participants REPLICA IDENTITY FULL;

-- Drop the helper function after use
DROP FUNCTION ensure_realtime_table(TEXT);