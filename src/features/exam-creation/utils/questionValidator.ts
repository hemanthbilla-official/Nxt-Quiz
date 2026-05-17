import type { ValidatedQuestion, ValidationError } from "@/types";

const VALID_QUESTION_TYPES = [
  "theory",
  "code-output",
  "spot-the-bug",
  "conceptual",
  "debugging",
  "programming",
];

export function validateQuestions(questions: unknown[]): { valid: boolean; errors: ValidationError[]; parsed: ValidatedQuestion[] } {
  const errors: ValidationError[] = [];
  const parsed: ValidatedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    const qErrors: string[] = [];

    if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
      qErrors.push("Missing question text");
    }

    const questionType = q.questionType || q.question_type || "theory";
    if (typeof questionType !== "string" || !VALID_QUESTION_TYPES.includes(questionType)) {
      qErrors.push(`Invalid type: ${String(questionType)}`);
    }

    if (questionType === "programming") {
      const starterCode = q.starterCode || q.starter_code;
      const starterFiles = q.starterFiles || q.starter_files;
      const testCases = q.testCases || q.test_cases;

      if ((typeof starterCode !== "string" || starterCode.trim().length === 0) && (!Array.isArray(starterFiles) || starterFiles.length === 0)) {
        qErrors.push("Missing starter code");
      }
      if (!Array.isArray(testCases) || testCases.length < 1) {
        qErrors.push("At least one test case required");
      }
    } else {
      if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
        qErrors.push("Invalid options");
      }
      const correctId = q.correctOptionId || q.correct_option_id;
      if (!correctId) qErrors.push("Missing correct option ID");
    }

    if (qErrors.length > 0) {
      errors.push({ index: i, errors: qErrors });
    } else {
      parsed.push(q as unknown as ValidatedQuestion);
    }
  }

  return { valid: errors.length === 0, errors, parsed };
}