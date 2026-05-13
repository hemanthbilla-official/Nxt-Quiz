export interface Participant {
  id: string;
  user_id: string;
  status: string;
  joined_at: string;
  tab_switch_count?: number;
  profiles: {
    full_name: string;
    email: string;
    student_college_id: string;
  };
}

export interface ExamData {
  id: string;
  exam_code: string;
  title: string;
  status: string;
  capacity: number;
  duration_seconds: number;
  starts_at: string | null;
  closes_at: string | null;
  created_at: string;
  questionsCount?: number;
}

export const STATUS_COLORS: Record<string, string> = {
  draft: "text-muted border-border",
  waiting: "text-warning border-warning/30",
  in_progress: "text-primary border-primary/30",
  closed: "text-success border-success/30",
};
