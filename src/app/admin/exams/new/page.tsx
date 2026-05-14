"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, FileJson, Upload, Copy } from "lucide-react";

const VALID_QUESTION_TYPES = [
  "theory",
  "code-output",
  "spot-the-bug",
  "conceptual",
  "debugging",
  "programming",
];
const VALID_CHALLENGE_MODES = ["function", "component"];
const FUNCTION_NAME_PATTERN = /^[A-Za-z_$][\w$]{0,80}$/;

interface ValidatedQuestion {
  id?: string;
  topic?: string;
  difficulty?: string;
  questionType?: string;
  question_type?: string;
  question: string;
  codeSnippet?: string | null;
  options?: { id: string; text: string }[];
  correctOptionId?: string | null;
  correct_option_id?: string | null;
  explanation?: string;
  tags?: string[];
  points?: number;
  starterCode?: string;
  starter_code?: string;
  starterFiles?: unknown[];
  starter_files?: unknown[];
  functionName?: string;
  function_name?: string;
  challengeMode?: string;
  challenge_mode?: string;
  testCases?: unknown[];
  test_cases?: unknown[];
  language?: string;
}

interface ValidationError {
  index: number;
  errors: string[];
}

function validateQuestions(questions: unknown[]): { valid: boolean; errors: ValidationError[]; parsed: ValidatedQuestion[] } {
  const errors: ValidationError[] = [];
  const parsed: ValidatedQuestion[] = [];

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i] as Record<string, unknown>;
    const qErrors: string[] = [];

    // Check question text
    if (!q.question || typeof q.question !== "string" || q.question.trim().length === 0) {
      qErrors.push("Missing or empty \"question\" field (required string)");
    }

    // Check questionType (optional but must be valid if provided)
    const questionType = q.questionType || q.question_type || "theory";
    if (typeof questionType !== "string" || !VALID_QUESTION_TYPES.includes(questionType)) {
      qErrors.push(`Invalid \"questionType\": \"${String(questionType)}\". Allowed values: ${VALID_QUESTION_TYPES.join(", ")}`);
    }

    if (questionType === "programming") {
      const starterCode = q.starterCode || q.starter_code;
      const starterFiles = q.starterFiles || q.starter_files;
      const functionName = q.functionName || q.function_name;
      const challengeMode = q.challengeMode || q.challenge_mode || "function";
      const testCases = q.testCases || q.test_cases;

      if (
        (typeof starterCode !== "string" || starterCode.trim().length === 0) &&
        (!Array.isArray(starterFiles) || starterFiles.length === 0)
      ) {
        qErrors.push("Programming question missing \"starterCode\" or \"starterFiles\" field");
      }

      if (Array.isArray(starterFiles)) {
        starterFiles.forEach((file, index) => {
          const starterFile = file as Record<string, unknown>;
          if (!starterFile || typeof starterFile !== "object" || Array.isArray(starterFile)) {
            qErrors.push(`Starter file ${index + 1}: must be an object`);
            return;
          }
          if (typeof starterFile.name !== "string" || !/\.(js|jsx|css)$/.test(starterFile.name)) {
            qErrors.push(`Starter file ${index + 1}: missing valid \"name\" ending in .js, .jsx, or .css`);
          }
          if (typeof starterFile.content !== "string") {
            qErrors.push(`Starter file ${index + 1}: missing \"content\" string`);
          }
        });
      }

      if (typeof challengeMode !== "string" || !VALID_CHALLENGE_MODES.includes(challengeMode)) {
        qErrors.push(`Invalid \"challengeMode\": \"${String(challengeMode)}\". Allowed values: ${VALID_CHALLENGE_MODES.join(", ")}`);
      }

      if (challengeMode === "function") {
        if (typeof functionName !== "string" || !FUNCTION_NAME_PATTERN.test(functionName)) {
          qErrors.push("Function programming question missing or invalid \"functionName\" field");
        }
      } else if (
        functionName !== undefined &&
        (typeof functionName !== "string" || !FUNCTION_NAME_PATTERN.test(functionName))
      ) {
        qErrors.push("React programming question has an invalid \"functionName\" field; omit it or use \"App\"");
      }

      if (!Array.isArray(testCases) || testCases.length < 1) {
        qErrors.push("Programming question must include at least one test case in \"testCases\"");
      } else {
        testCases.forEach((testCase, index) => {
          const tc = testCase as Record<string, unknown>;
          if (!tc || typeof tc !== "object" || Array.isArray(tc)) {
            qErrors.push(`Test case ${index + 1}: must be an object`);
            return;
          }

          if (challengeMode === "function") {
            if (tc.input !== undefined && !Array.isArray(tc.input)) {
              qErrors.push(`Test case ${index + 1}: \"input\" must be an array when provided`);
            }
            if (!Object.prototype.hasOwnProperty.call(tc, "expected")) {
              qErrors.push(`Test case ${index + 1}: missing \"expected\" value`);
            }
          }

          if (challengeMode === "component") {
            if (tc.props !== undefined && (typeof tc.props !== "object" || Array.isArray(tc.props))) {
              qErrors.push(`Test case ${index + 1}: \"props\" must be an object when provided`);
            }
            if (
              tc.expectedElement !== undefined &&
              typeof tc.expectedElement !== "string"
            ) {
              qErrors.push(`Test case ${index + 1}: \"expectedElement\" must be a string when provided`);
            }
            if (
              !Array.isArray(tc.expectedContains) ||
              tc.expectedContains.some((item) => typeof item !== "string")
            ) {
              qErrors.push(`Test case ${index + 1}: \"expectedContains\" must be an array of strings`);
            }
          }
        });
      }
    } else {
      // Check options for MCQ-style questions
      if (!q.options) {
        qErrors.push("Missing \"options\" field (required array of option objects)");
      } else if (!Array.isArray(q.options)) {
        qErrors.push("\"options\" must be an array");
      } else {
        if (q.options.length < 2) {
          qErrors.push(`\"options\" must have at least 2 entries, found ${q.options.length}`);
        }
        for (let j = 0; j < q.options.length; j++) {
          const opt = q.options[j] as Record<string, unknown>;
          if (!opt || typeof opt !== "object") {
            qErrors.push(`Option ${j + 1}: must be an object with \"id\" and \"text\"`);
          } else {
            if (!opt.id || typeof opt.id !== "string") {
              qErrors.push(`Option ${j + 1}: missing or invalid \"id\" (expected string like \"A\", \"B\", etc.)`);
            }
            if (!opt.text || typeof opt.text !== "string" || opt.text.trim().length === 0) {
              qErrors.push(`Option ${j + 1}: missing or empty \"text\"`);
            }
          }
        }
      }

      // Check correctOptionId for MCQ-style questions
      const correctId = q.correctOptionId || q.correct_option_id;
      if (!correctId || typeof correctId !== "string") {
        qErrors.push("Missing \"correctOptionId\" field (required string matching one of the option IDs)");
      } else if (Array.isArray(q.options)) {
        const optionIds = q.options.map((o: Record<string, unknown>) => o.id);
        if (!optionIds.includes(correctId)) {
          qErrors.push(`\"correctOptionId\" value \"${correctId}\" does not match any option ID (${optionIds.join(", ")})`);
        }
      }
    }

    // Check tags (optional but must be array of strings)
    if (q.tags && !Array.isArray(q.tags)) {
      qErrors.push("\"tags\" must be an array of strings if provided");
    }

    if (qErrors.length > 0) {
      errors.push({ index: i, errors: qErrors });
    } else {
      parsed.push(q as unknown as ValidatedQuestion);
    }
  }

  return { valid: errors.length === 0, errors, parsed };
}

export default function CreateExam() {
  const [currentStep, setCurrentStep] = useState(1);
  const [title, setTitle] = useState("");
  const [duration, setDuration] = useState<number | string>("");
  const [capacity, setCapacity] = useState<number | string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [jsonFile, setJsonFile] = useState<File | null>(null);
  const [validatedQuestions, setValidatedQuestions] = useState<ValidatedQuestion[] | null>(null);
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
  const [isValidated, setIsValidated] = useState(false);
  const [result, setResult] = useState<{ examCode: string; examId: string } | null>(null);
  
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const router = useRouter();

  const handleBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const isFormValid = () => {
    return title.trim().length > 0 && Number(duration) >= 5 && Number(capacity) >= 1;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setJsonFile(file);
    setIsValidated(false);
    setValidatedQuestions(null);
    setValidationErrors([]);
    setError("");

    if (!file) return;

    try {
      const text = await file.text();
      let questions;
      try {
        questions = JSON.parse(text);
        if (!Array.isArray(questions)) questions = [questions];
      } catch {
        setError("Invalid JSON — file could not be parsed. Please check the file is valid JSON.");
        return;
      }

      if (questions.length === 0) {
        setError("JSON file contains no questions. The file must contain at least one question object.");
        return;
      }

      const result = validateQuestions(questions);
      if (result.valid) {
        setValidatedQuestions(result.parsed);
        setIsValidated(true);
        setValidationErrors([]);
      } else {
        setValidationErrors(result.errors);
        setIsValidated(false);
      }
    } catch {
      setError("Could not read the file. Please try again.");
    }
  };

  const handleCreate = async () => {
    if (!isValidated || !validatedQuestions) {
      setError("Please upload and validate a questions JSON file first");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/admin/exams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          durationMinutes: Number(duration),
          capacity: Number(capacity),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create exam");
        setLoading(false);
        return;
      }

      const examId = data.examId;
      const importRes = await fetch("/api/admin/questions/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questions: validatedQuestions, examId }),
      });

      if (!importRes.ok) {
        const importData = await importRes.json();
        setError("Exam created, but question upload failed: " + (importData.error || "Unknown error"));
        setLoading(false);
        return;
      }

      setResult({ examCode: data.examCode, examId: data.examId });
      setLoading(false);
    } catch (err) {
      setError("Network error occurred during creation");
      setLoading(false);
    }
  };

  const steps = [
    { id: 1, label: "Exam Info" },
    { id: 2, label: "Questions" },
    { id: 3, label: "Review" }
  ];

  if (result) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 flex items-center justify-center min-h-[400px]">
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-success/10 text-success mb-6">
            <CheckCircle className="w-10 h-10" />
          </div>
          <h1 className="text-2xl font-bold mb-2">Exam Created!</h1>
          <p className="text-muted-foreground text-sm mb-8">
            Your assessment session is now live. Share the access code below.
          </p>

          <div className="card p-8 mb-8 border-success/30 bg-success/5">
            <p className="text-[10px] text-muted-foreground mb-3 uppercase tracking-widest font-bold">
              Access Code
            </p>
            <p className="text-5xl font-mono font-bold text-foreground tracking-[0.2em]">
              {result.examCode}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                navigator.clipboard.writeText(result.examCode);
                alert("Code copied to clipboard!");
              }}
              className="btn-secondary h-12 flex items-center justify-center gap-2"
            >
              <Copy className="w-4 h-4" />
              <span>Copy Code</span>
            </button>
            <button
              onClick={() => router.push(`/admin/exams/${result.examId}`)}
              className="btn-primary h-12"
            >
              Go to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">Create New Exam</h1>
        <p className="text-muted-foreground">Setup your assessment parameters and questions</p>
      </div>

      {/* Stepper Progress */}
      <div className="flex items-center justify-between mb-12 relative px-10">
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -translate-y-1/2 -z-10" />
        {steps.map(step => (
          <div key={step.id} className="flex flex-col items-center gap-2 bg-background px-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2 transition-colors ${
              currentStep === step.id ? "bg-primary border-primary text-primary-foreground" : 
              currentStep > step.id ? "bg-success border-success text-primary-foreground" : "bg-background border-border text-muted-foreground"
            }`}>
              {currentStep > step.id ? <CheckCircle className="w-5 h-5" /> : step.id}
            </div>
            <span className={`text-xs font-bold uppercase tracking-wider ${currentStep === step.id ? "text-primary" : "text-muted-foreground"}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="card p-8 min-h-[400px] flex flex-col">
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-danger/10 border border-danger/20 text-danger text-sm flex items-start gap-3 animate-fade-in">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <div className="flex-1">
          {currentStep === 1 && (
            <div className="space-y-6 animate-fade-in">
              <div className="space-y-2">
                <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Exam Title (required)</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onBlur={() => handleBlur("title")}
                  onChange={e => setTitle(e.target.value)}
                  className={`w-full h-10 px-4 bg-transparent border rounded-md focus:outline-none focus:border-foreground transition-colors ${
                    touched.title && !title.trim() ? "border-danger" : "border-border"
                  }`}
                  placeholder="e.g. Full-stack Assessment Q2"
                />
                {touched.title && !title.trim() && (
                  <p className="text-[10px] text-danger font-bold uppercase mt-1">Title is required</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Duration (mins, required)</label>
                  <input
                    type="number"
                    value={duration}
                    onBlur={() => handleBlur("duration")}
                    onChange={e => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                    className={`w-full h-10 px-4 bg-transparent border rounded-md focus:outline-none focus:border-foreground transition-colors ${
                      touched.duration && Number(duration) < 5 ? "border-danger" : "border-border"
                    }`}
                    placeholder="Min 5 mins"
                  />
                  {touched.duration && Number(duration) < 5 && (
                    <p className="text-[10px] text-danger font-bold uppercase mt-1">Min 5 minutes</p>
                  )}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-muted-foreground uppercase tracking-wider">Capacity (required)</label>
                  <input
                    type="number"
                    value={capacity}
                    onBlur={() => handleBlur("capacity")}
                    onChange={e => setCapacity(e.target.value === "" ? "" : Number(e.target.value))}
                    className={`w-full h-10 px-4 bg-transparent border rounded-md focus:outline-none focus:border-foreground transition-colors ${
                      touched.capacity && Number(capacity) < 1 ? "border-danger" : "border-border"
                    }`}
                    placeholder="Min 1 student"
                  />
                  {touched.capacity && Number(capacity) < 1 && (
                    <p className="text-[10px] text-danger font-bold uppercase mt-1">Min capacity is 1</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6 animate-fade-in">
              <div className="p-8 border border-dashed border-border hover:border-muted-foreground transition-colors rounded-lg bg-transparent text-center flex flex-col items-center">
                <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors ${
                  isValidated ? "bg-success/10 text-success" : validationErrors.length > 0 ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"
                }`}>
                  {isValidated ? <CheckCircle className="w-8 h-8" /> : <FileJson className="w-8 h-8" />}
                </div>
                <h3 className="font-bold text-lg mb-2">Upload Question Data</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto mb-6">
                  Select a valid JSON file containing your exam questions. We&apos;ll validate the schema instantly.
                </p>
                <label className="btn-secondary h-11 px-8 flex items-center gap-2 cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>{jsonFile ? "Change File" : "Choose File"}</span>
                  <input type="file" accept=".json" onChange={handleFileChange} className="hidden" />
                </label>
                {jsonFile && (
                  <p className="mt-4 text-xs font-mono text-muted-foreground">{jsonFile.name} ({(jsonFile.size / 1024).toFixed(1)} KB)</p>
                )}
              </div>

              {validationErrors.length > 0 && (
                <div className="rounded-lg border border-danger/30 overflow-hidden animate-fade-in">
                  <div className="bg-danger/5 px-4 py-3 border-b border-danger/30">
                    <p className="text-xs font-bold text-danger uppercase tracking-wider">Validation Errors Found ({validationErrors.length})</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-4 space-y-4 custom-scrollbar">
                    {validationErrors.map(err => (
                      <div key={err.index} className="space-y-1">
                        <p className="text-[10px] font-bold text-foreground">Question #{err.index + 1}</p>
                        {err.errors.map((e, idx) => (
                          <p key={idx} className="text-[11px] text-danger pl-3 border-l border-danger/30">{e}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isValidated && validatedQuestions && (
                <div className="p-4 bg-success/5 border border-success/30 rounded-lg flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-success" />
                    <div>
                      <p className="text-sm font-bold text-success">Validation Successful</p>
                      <p className="text-[11px] text-success/70">{validatedQuestions.length} questions identified and ready to import.</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {Object.entries(validatedQuestions.reduce((acc, q) => {
                      const t = q.questionType || q.question_type || "theory";
                      acc[t] = (acc[t] || 0) + 1;
                      return acc;
                    }, {} as Record<string, number>)).map(([type, count]) => (
                      <span key={type} className="px-2 py-0.5 rounded bg-success/10 text-success text-[9px] font-bold uppercase tracking-wider">
                        {type}: {count}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-8 animate-fade-in">
              <div className="grid grid-cols-2 gap-8">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Exam Title</p>
                  <p className="font-bold text-xl">{title}</p>
                </div>
                <div className="flex gap-12">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Duration</p>
                    <p className="font-bold">{duration} mins</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Capacity</p>
                    <p className="font-bold">{capacity} seats</p>
                  </div>
                </div>
              </div>

              <div className="p-6 bg-card border border-border rounded-lg">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Questions Summary</p>
                  <span className="text-xs font-bold">{validatedQuestions?.length} Total Questions</span>
                </div>
                <div className="space-y-2">
                  {validatedQuestions?.slice(0, 5).map((q, idx) => (
                    <div key={idx} className="flex items-center gap-3 py-1.5 text-xs border-b border-border/50 last:border-0">
                      <span className="text-muted-foreground font-mono w-4">{idx + 1}</span>
                      <span className="flex-1 truncate">{q.question}</span>
                      <span className="text-[9px] px-1.5 py-0.5 bg-background border border-border rounded text-muted-foreground uppercase font-bold tracking-tighter">
                        {q.questionType || q.question_type || "theory"}
                      </span>
                    </div>
                  ))}
                  {(validatedQuestions?.length || 0) > 5 && (
                    <p className="text-[10px] text-center text-muted-foreground pt-2">
                      + {(validatedQuestions?.length || 0) - 5} more questions
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-12 flex items-center justify-between pt-6 border-t border-border">
          <button
            disabled={currentStep === 1 || loading}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="btn-secondary h-11 px-6 disabled:opacity-0"
          >
            Previous
          </button>
          
          {currentStep < 3 ? (
            <button
              disabled={currentStep === 1 ? !isFormValid() : !isValidated}
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="btn-primary h-11 px-8"
            >
              Next Step
            </button>
          ) : (
            <button
              disabled={loading}
              onClick={handleCreate}
              className="btn-primary h-11 px-10 flex items-center gap-2"
            >
              {loading && <div className="spinner h-4 w-4 border-white border-t-transparent" />}
              <span>{loading ? "Creating..." : "Confirm & Create Exam"}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
