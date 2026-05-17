import type { ExamControls } from "@/lib/exam-controls";

export type ControlItem = {
  key: keyof ExamControls;
  label: string;
  description: string;
};

export type ControlGroup = {
  title: string;
  description: string;
  items: ControlItem[];
};

export const controlGroups: ControlGroup[] = [
  {
    title: "Proctoring",
    description: "Controls monitoring, warnings, and fullscreen enforcement.",
    items: [
      { key: "proctoringEnabled", label: "Log Tab Switches", description: "Record tab switches in attempt activity and admin views." },
      { key: "tabSwitchWarningEnabled", label: "Tab Warning Modal", description: "Show a warning popup when a student leaves the exam tab." },
      { key: "fullscreenRequired", label: "Require Fullscreen", description: "Block the exam behind the fullscreen-required modal." },
    ],
  },
  {
    title: "Browser Restrictions",
    description: "Controls copy, paste, and context menu restrictions.",
    items: [
      { key: "copyPasteBlocked", label: "Block Copy, Cut, Paste", description: "Prevent clipboard shortcuts and paste actions during the exam." },
      { key: "rightClickBlocked", label: "Block Right Click", description: "Prevent the browser context menu during the exam." },
    ],
  },
  {
    title: "Student Actions",
    description: "Controls visible exam navigation and answer tools.",
    items: [
      { key: "questionNavigatorEnabled", label: "Question Navigator", description: "Show the right-side question grid and review shortcut." },
      { key: "bookmarksEnabled", label: "Bookmarks", description: "Allow students to bookmark questions." },
      { key: "skipEnabled", label: "Skip Button", description: "Allow students to mark unanswered questions as skipped." },
      { key: "clearAnswerEnabled", label: "Clear Answer", description: "Allow students to clear selected MCQ answers." },
      { key: "themeToggleEnabled", label: "Theme Toggle", description: "Show the light/dark theme button during exams." },
    ],
  },
  {
    title: "Programming Editor",
    description: "Controls tools available in programming questions.",
    items: [
      { key: "codeRunTestsEnabled", label: "Run Tests", description: "Allow students to run server-side test cases." },
      { key: "codeFormatEnabled", label: "Format", description: "Allow students to format code with Prettier." },
      { key: "codeConsoleEnabled", label: "Console", description: "Allow students to view code output and errors." },
      { key: "codeFileActionsEnabled", label: "File Actions", description: "Allow adding and deleting editor files." },
      { key: "codeZoomEnabled", label: "Code Zoom", description: "Allow changing editor font size." },
    ],
  },
];