"use client";

import { memo } from "react";
import { ProgrammingEditor } from "@/features/programming-editor/components/ProgrammingEditor";
import { DEFAULT_EXAM_CONTROLS } from "@/lib/exam-controls";
import type { ChallengeMode, TestCase } from "@/lib/editorTypes";
import type { ExamControls } from "@/lib/exam-controls";

type ProgrammingQuestionProps = {
  questionId: string;
  challengeMode: ChallengeMode;
  starterCode: string;
  testCases: TestCase[];
  savedCode?: string;
  onCodeChange: (code: string) => void;
  examId: string;
  controls?: ExamControls;
  theme?: "dark" | "light";
  className?: string;
};

export default memo(function ProgrammingQuestion(props: ProgrammingQuestionProps) {
  return <ProgrammingEditor {...props} />;
});
