import { useState, useEffect, useCallback, useRef } from "react";

interface UseExamTimerOptions {
  initialTime: number;
  onTimeUp: () => void;
}

interface UseExamTimerResult {
  timeLeft: number | null;
  isUrgent: boolean;
  formattedTime: string;
}

export function useExamTimer({ initialTime, onTimeUp }: UseExamTimerOptions): UseExamTimerResult {
  const [timeLeft, setTimeLeft] = useState<number | null>(initialTime);
  const onTimeUpRef = useRef(onTimeUp);
  onTimeUpRef.current = onTimeUp;

  useEffect(() => {
    setTimeLeft(initialTime);
  }, [initialTime]);

  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          setTimeout(() => onTimeUpRef.current(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft]);

  const formatTime = useCallback((seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  return {
    timeLeft,
    isUrgent: timeLeft !== null && timeLeft < 300,
    formattedTime: timeLeft !== null ? formatTime(timeLeft) : "00:00",
  };
}