"use client";

import { useMemo } from "react";
import { useExamControls } from "../hooks";
import { controlGroups } from "../config/controlGroups";

interface ToggleProps {
  checked: boolean;
  disabled: boolean;
  onChange: () => void;
}

function Toggle({ checked, disabled, onChange }: ToggleProps) {
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

export function ControlsPage() {
  const {
    controls,
    loading,
    saving,
    error,
    savedAt,
    message,
    enabledCount,
    updateControl,
    setAll,
    resetDefaults,
    saveControls,
  } = useExamControls();

  const totalControls = useMemo(() => Object.keys(controls).length, [controls]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      <div className="pb-6 border-b border-border">
        <h1 className="text-2xl font-bold tracking-tight">Exam Controls</h1>
        <p className="mt-1 text-sm text-muted-foreground max-w-2xl">
          Configure student-facing exam behavior globally. Changes apply on next exam load.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-warning/20 bg-warning-muted p-4 text-sm font-medium text-warning">
          {error}
        </div>
      )}

      {message && (
        <div className="rounded-lg border border-border bg-card p-4 text-sm font-medium text-foreground">
          {message}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={saveControls}
          disabled={saving || loading}
          className="btn-primary h-9"
        >
          {saving ? "Saving..." : "Save Controls"}
        </button>
        <button type="button" onClick={() => setAll(true)} disabled={saving || loading} className="btn-secondary h-9">
          Enable All
        </button>
        <button type="button" onClick={() => setAll(false)} disabled={saving || loading} className="btn-secondary h-9">
          Disable All
        </button>
        <button type="button" onClick={resetDefaults} disabled={saving || loading} className="btn-ghost h-9">
          Reset Defaults
        </button>

        <div className="flex items-center gap-2 ml-auto text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{enabledCount}/{totalControls}</span>
          <span>enabled</span>
          {savedAt && (
            <>
              <span className="text-border">·</span>
              <span>saved {new Date(savedAt).toLocaleString()}</span>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {controlGroups.map((group) => (
          <section key={group.title} className="card overflow-hidden">
            <div className="border-b border-border bg-muted/30 px-5 py-4">
              <h2 className="text-[15px] font-semibold text-foreground">{group.title}</h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{group.description}</p>
            </div>
            <div className="divide-y divide-border">
              {group.items.map((item) => (
                <div key={item.key} className="flex items-start justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground leading-relaxed">{item.description}</p>
                  </div>
                  <Toggle checked={controls[item.key]} disabled={saving || loading} onChange={() => updateControl(item.key)} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}