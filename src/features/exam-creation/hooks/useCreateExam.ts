import { useState, useCallback, useMemo } from "react";
import type { ValidatedQuestion, ValidationError } from "@/types";
import { validateQuestions } from "../utils/questionValidator";
import * as api from "../services/examsApi";

interface UseCreateExamResult {
  title: string;
  setTitle: (title: string) => void;
  duration: number | string;
  setDuration: (duration: number | string) => void;
  capacity: number | string;
  setCapacity: (capacity: number | string) => void;
  jsonFile: File | null;
  setJsonFile: (file: File | null) => void;
  validatedQuestions: ValidatedQuestion[] | null;
  validationErrors: ValidationError[];
  isValidated: boolean;
  isFormValid: boolean;
  topicSummary: Record<string, number>;
  handleFileChange: (content: string) => void;
  createExam: () => Promise<{ examCode: string; examId: string } | null>;
  loading: boolean;
  error: string | null;
}

export function useCreateExam(): UseCreateExamResult {
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | string>("");
  const [capacity, setCapacity] = useState<number | string>("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [validatedQuestions, setValidatedQuestions] = useState<ValidatedQuestion[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isFormValid = useMemo(() => {
    const cap = Number(capacity);
    return title.trim().length > 0 && Number(duration) >= 5 && cap >= 1 && cap <= 300 && isValidated;
  }, [title, duration, capacity, isValidated]);

  const topicSummary = useMemo(() => {
    if (!validatedQuestions) return {};
    return validatedQuestions.reduce((acc, q) => {
      const t = q.topic || "General";
      acc[t] = (acc[t] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [validatedQuestions]);

  const handleFileChange = useCallback((content: string) => {
    setIsValidated(false);
    setValidatedQuestions(null);
    setValidationErrors([]);
    setError("");

    try {
      let questions;
      try {
        questions = JSON.parse(content);
        if (!Array.isArray(questions)) questions = [questions];
      } catch {
        setError("Invalid JSON format.");
        return;
      }

      if (questions.length === 0) {
        setError("JSON file is empty.");
        return;
      }

      const valResult = validateQuestions(questions);
      if (valResult.valid) {
        setValidatedQuestions(valResult.parsed);
        setIsValidated(true);
      } else {
        setValidationErrors(valResult.errors);
        setIsValidated(false);
      }
    } catch {
      setError("Could not read file.");
    }
  }, []);

  const createExam = useCallback(async () => {
    if (!isFormValid || !validatedQuestions) return null;

    setLoading(true);
    setError("");

    try {
      const examData = await api.createExam({
        title,
        durationMinutes: Number(duration),
        capacity: Number(capacity),
      });

      try {
        await api.importQuestions(examData.examId, validatedQuestions);
        return examData;
      } catch (importError) {
        setError("Exam created, but questions failed: " + (importError instanceof Error ? importError.message : "Error"));
        return null;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error occurred");
      return null;
    } finally {
      setLoading(false);
    }
  }, [isFormValid, validatedQuestions, title, duration, capacity]);

  return {
    title, setTitle,
    duration, setDuration,
    capacity, setCapacity,
    jsonFile, setJsonFile,
    validatedQuestions,
    validationErrors,
    isValidated,
    isFormValid,
    topicSummary,
    handleFileChange,
    createExam,
    loading,
    error,
  };
}