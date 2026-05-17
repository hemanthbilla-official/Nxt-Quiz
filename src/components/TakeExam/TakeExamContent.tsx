"use client";

import { ExamContainer } from "@/features/exam-session/components/ExamContainer";

export function TakeExamContent({ examId }: { examId: string }) {
  return <ExamContainer examId={examId} />;
}