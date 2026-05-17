"use client";

import { memo } from "react";
import { useExamTimer } from "../hooks/useExamTimer";

interface TimerDisplayProps {
  initialTime: number;
  onTimeUp: () => void;
}

export const TimerDisplay = memo(function TimerDisplay({
  initialTime,
  onTimeUp,
}: TimerDisplayProps) {
  const { formattedTime, isUrgent } = useExamTimer({ initialTime, onTimeUp });

  return (
    <div
      className={`px-4 py-1.5 rounded-lg font-mono font-bold text-lg transition-colors border ${
        isUrgent
          ? "bg-danger-muted text-danger border-danger/20"
          : "bg-background-secondary text-foreground border-border"
      }`}
    >
      {formattedTime}
    </div>
  );
});
