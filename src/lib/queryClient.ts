import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000, // 30 seconds - data is considered fresh for 30s
      gcTime: 5 * 60 * 1000, // 5 minutes - keep unused data for 5 minutes
      refetchOnWindowFocus: false, // Don't refetch when window gains focus
      retry: 1, // Only retry once on failure
      throwOnError: false, // Don't throw, return error as part of result
    },
    mutations: {
      retry: 0, // Don't retry mutations by default
      throwOnError: false,
    },
  },
});

// Query keys for consistent cache management
export const queryKeys = {
  // Exams
  exams: ["exams"] as const,
  exam: (examId: string) => ["exams", examId] as const,
  examAnalytics: (examId: string) => ["exams", examId, "analytics"] as const,
  examAnalyticsOverview: (examId: string) => ["exams", examId, "analytics", "overview"] as const,
  examParticipants: (examId: string) => ["exams", examId, "participants"] as const,
  examQuestionsCount: (examId: string) => ["exams", examId, "questions-count"] as const,
  
  // Students
  students: ["students"] as const,
  student: (studentId: string) => ["students", studentId] as const,
  
  // Questions
  questions: ["questions"] as const,
  question: (questionId: string) => ["questions", questionId] as const,
  
  // Exam session
  examSession: (examId: string) => ["exam-session", examId] as const,
  examInit: (examId: string) => ["exam-init", examId] as const,
  
  // Scores
  scores: ["scores"] as const,
  
  // Live stats
  liveStats: ["live-stats"] as const,
  
  // Controls
  controls: ["controls"] as const,
  
  // Live exam monitoring
  liveExams: ["live-exams"] as const,
};