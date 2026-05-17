import type { RunCodeResponse } from "@/lib/editorTypes";

export interface RunCodeRequest {
  questionId: string;
  code: string;
  language: string;
}

export async function runCodeTests(
  examId: string,
  request: RunCodeRequest
): Promise<RunCodeResponse> {
  const res = await fetch(`/api/exam/${examId}/run-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (res.ok) {
    return res.json();
  }

  const errorData = await res.json().catch(() => ({}));
  return {
    success: false,
    results: [],
    summary: {
      passed: 0,
      failed: 0,
      total: 0,
    },
    error: errorData.error || "Failed to run tests",
  };
}