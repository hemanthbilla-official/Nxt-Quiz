import type { SupabaseClient } from "@supabase/supabase-js";

export type ExamControls = {
  proctoringEnabled: boolean;
  tabSwitchWarningEnabled: boolean;
  fullscreenRequired: boolean;
  copyPasteBlocked: boolean;
  rightClickBlocked: boolean;
  questionNavigatorEnabled: boolean;
  bookmarksEnabled: boolean;
  skipEnabled: boolean;
  clearAnswerEnabled: boolean;
  themeToggleEnabled: boolean;
  codeRunTestsEnabled: boolean;
  codeFormatEnabled: boolean;
  codeConsoleEnabled: boolean;
  codeFileActionsEnabled: boolean;
  codeZoomEnabled: boolean;
};

export const EXAM_CONTROLS_KEY = "exam_controls";

export const DEFAULT_EXAM_CONTROLS: ExamControls = {
  proctoringEnabled: true,
  tabSwitchWarningEnabled: true,
  fullscreenRequired: true,
  copyPasteBlocked: true,
  rightClickBlocked: true,
  questionNavigatorEnabled: true,
  bookmarksEnabled: true,
  skipEnabled: true,
  clearAnswerEnabled: true,
  themeToggleEnabled: true,
  codeRunTestsEnabled: true,
  codeFormatEnabled: true,
  codeConsoleEnabled: true,
  codeFileActionsEnabled: true,
  codeZoomEnabled: true,
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export function normalizeExamControls(value: unknown): ExamControls {
  const row = asRecord(value);
  const controls = { ...DEFAULT_EXAM_CONTROLS };

  for (const key of Object.keys(controls) as Array<keyof ExamControls>) {
    if (typeof row[key] === "boolean") {
      controls[key] = row[key];
    }
  }

  return controls;
}

export async function getExamControls(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("app_controls")
    .select("value")
    .eq("key", EXAM_CONTROLS_KEY)
    .maybeSingle();

  if (error) {
    console.warn(
      "Failed to load exam controls, using defaults:",
      error.message,
    );
    return DEFAULT_EXAM_CONTROLS;
  }

  return normalizeExamControls(data?.value);
}
