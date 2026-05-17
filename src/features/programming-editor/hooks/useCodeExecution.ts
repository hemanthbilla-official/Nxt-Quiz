import { useState, useCallback, useRef } from "react";
import type { RunCodeResponse } from "@/lib/editorTypes";
import { runCodeTests } from "../services/codeRunner";

interface UseCodeExecutionOptions {
  examId: string;
  questionId: string;
  testCaseCount: number;
  enabled: boolean;
}

interface UseCodeExecutionResult {
  runResults: RunCodeResponse | null;
  isRunning: boolean;
  cooldown: number;
  runTests: (code: string) => Promise<void>;
}

export function useCodeExecution({
  examId,
  questionId,
  testCaseCount,
  enabled,
}: UseCodeExecutionOptions): UseCodeExecutionResult {
  const [runResults, setRunResults] = useState<RunCodeResponse | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const runTests = useCallback(
    async (code: string) => {
      if (!enabled || isRunning || cooldown > 0) return;

      setIsRunning(true);
      setRunResults(null);

      try {
        const result = await runCodeTests(examId, {
          questionId,
          code,
          language: "javascript",
        });
        setRunResults(result);

        setCooldown(3);
        cooldownRef.current = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              if (cooldownRef.current) {
                clearInterval(cooldownRef.current);
              }
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } catch {
        setRunResults({
          success: false,
          results: [],
          summary: {
            passed: 0,
            failed: testCaseCount,
            total: testCaseCount,
          },
          error: "Network error — could not reach the server",
        });
      } finally {
        setIsRunning(false);
      }
    },
    [enabled, examId, isRunning, cooldown, questionId, testCaseCount]
  );

  return {
    runResults,
    isRunning,
    cooldown,
    runTests,
  };
}