"use client";

import { useEffect, useMemo, useState } from "react";
import { DEFAULT_EXAM_CONTROLS, type ExamControls } from "@/lib/exam-controls";

type ControlItem = {
  key: keyof ExamControls;
  label: string;
  description: string;
};

type ControlGroup = {
  title: string;
  description: string;
  items: ControlItem[];
};

const controlGroups: ControlGroup[] = [
  {
    title: "Proctoring",
    description: "Controls monitoring, warnings, and fullscreen enforcement.",
    items: [
      {
        key: "proctoringEnabled",
        label: "Log Tab Switches",
        description: "Record tab switches in attempt activity and admin views.",
      },
      {
        key: "tabSwitchWarningEnabled",
        label: "Tab Warning Modal",
        description: "Show a warning popup when a student leaves the exam tab.",
      },
      {
        key: "fullscreenRequired",
        label: "Require Fullscreen",
        description: "Block the exam behind the fullscreen-required modal.",
      },
    ],
  },
  {
    title: "Browser Restrictions",
    description: "Controls copy, paste, and context menu restrictions.",
    items: [
      {
        key: "copyPasteBlocked",
        label: "Block Copy, Cut, Paste",
        description:
          "Prevent clipboard shortcuts and paste actions during the exam.",
      },
      {
        key: "rightClickBlocked",
        label: "Block Right Click",
        description: "Prevent the browser context menu during the exam.",
      },
    ],
  },
  {
    title: "Student Actions",
    description: "Controls visible exam navigation and answer tools.",
    items: [
      {
        key: "questionNavigatorEnabled",
        label: "Question Navigator",
        description: "Show the right-side question grid and review shortcut.",
      },
      {
        key: "bookmarksEnabled",
        label: "Bookmarks",
        description: "Allow students to bookmark questions.",
      },
      {
        key: "skipEnabled",
        label: "Skip Button",
        description: "Allow students to mark unanswered questions as skipped.",
      },
      {
        key: "clearAnswerEnabled",
        label: "Clear Answer",
        description: "Allow students to clear selected MCQ answers.",
      },
      {
        key: "themeToggleEnabled",
        label: "Theme Toggle",
        description: "Show the light/dark theme button during exams.",
      },
    ],
  },
  {
    title: "Programming Editor",
    description: "Controls tools available in programming questions.",
    items: [
      {
        key: "codeRunTestsEnabled",
        label: "Run Tests",
        description: "Allow students to run server-side test cases.",
      },
      {
        key: "codeFormatEnabled",
        label: "Format",
        description: "Allow students to format code with Prettier.",
      },
      {
        key: "codeConsoleEnabled",
        label: "Console",
        description: "Allow students to view code output and errors.",
      },
      {
        key: "codeFileActionsEnabled",
        label: "File Actions",
        description: "Allow adding and deleting editor files.",
      },
      {
        key: "codeZoomEnabled",
        label: "Code Zoom",
        description: "Allow changing editor font size.",
      },
    ],
  },
];

function Toggle({
  checked,
  disabled,
  onChange,
}: {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className="toggle-switch"
    >
      <span className="toggle-thumb" />
    </button>
  );
}

export default function AdminControlsPage() {
  const [controls, setControls] = useState<ExamControls>(DEFAULT_EXAM_CONTROLS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const enabledCount = useMemo(
    () => Object.values(controls).filter(Boolean).length,
    [controls],
  );

  useEffect(() => {
    async function loadControls() {
      try {
        const res = await fetch("/api/admin/controls");
        const data = await res.json();

        if (data.controls) {
          setControls(data.controls);
        }
        if (data.updatedAt) {
          setSavedAt(data.updatedAt);
        }
        if (data.setupRequired) {
          setSetupError(
            "Database table is missing. Run the admin controls migration before saving changes.",
          );
        }
      } catch (error) {
        setMessage(
          error instanceof Error ? error.message : "Failed to load controls",
        );
      } finally {
        setLoading(false);
      }
    }

    loadControls();
  }, []);

  const updateControl = (key: keyof ExamControls) => {
    setControls((current) => ({
      ...current,
      [key]: !current[key],
    }));
    setMessage("");
  };

  const setAll = (value: boolean) => {
    setControls((current) => {
      const next = { ...current };
      for (const key of Object.keys(next) as Array<keyof ExamControls>) {
        next[key] = value;
      }
      return next;
    });
    setMessage("");
  };

  const resetDefaults = () => {
    setControls(DEFAULT_EXAM_CONTROLS);
    setMessage("");
  };

  const saveControls = async () => {
    setSaving(true);
    setMessage("");

    try {
      const res = await fetch("/api/admin/controls", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ controls }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to save controls");
      }

      setControls(data.controls);
      setSavedAt(data.updatedAt);
      setSetupError("");
      setMessage("Controls saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Failed to save controls",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Exam Controls</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Configure student-facing exam behavior globally. Changes apply on next exam load.
        </p>
      </div>

      {setupError && (
        <div className="rounded-lg border border-warning/20 bg-warning-muted p-4 text-sm font-medium text-warning">
          {setupError}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">
          {message}
        </div>
      )}

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveControls}
          disabled={saving || loading}
          className="btn-primary h-9"
        >
          {saving ? "Saving..." : "Save Controls"}
        </button>
        <button
          type="button"
          onClick={() => setAll(true)}
          disabled={saving || loading}
          className="btn-secondary h-9"
        >
          Enable All
        </button>
        <button
          type="button"
          onClick={() => setAll(false)}
          disabled={saving || loading}
          className="btn-secondary h-9"
        >
          Disable All
        </button>
        <button
          type="button"
          onClick={resetDefaults}
          disabled={saving || loading}
          className="btn-ghost h-9"
        >
          Reset Defaults
        </button>

        <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{enabledCount}/{Object.keys(controls).length}</span>
          <span>enabled</span>
          {savedAt && (
            <>
              <span className="text-border">·</span>
              <span>saved {new Date(savedAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      {/* Control Groups */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {controlGroups.map((group) => (
          <section key={group.title} className="card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-foreground">
                {group.title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {group.description}
              </p>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-4 px-5 py-4"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {item.label}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                  <Toggle
                    checked={controls[item.key]}
                    disabled={saving || loading}
                    onChange={() => updateControl(item.key)}
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
