"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, AlertCircle, FileJson, Upload, Copy, Settings2, Clock, Users, ArrowLeft, Terminal, BarChart3, Loader2, ChevronRight } from "lucide-react";
import { toast } from "react-toastify";
import { useCreateExam } from "../hooks/useCreateExam";

export function CreateExamPage() {
  const router = useRouter();
  const [result, setResult] = useState<{ examCode: string; examId: string } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const {
    title, setTitle,
    duration, setDuration,
    capacity, setCapacity,
    validatedQuestions,
    validationErrors,
    isValidated,
    isFormValid,
    topicSummary,
    handleFileChange: processFileContent,
    createExam,
    loading,
    error,
  } = useCreateExam();

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const handleFileInputChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      processFileContent(text);
    } catch {
      toast.error("Could not read file");
    }
  }, [processFileContent]);

  const handleCreate = async () => {
    const examResult = await createExam();
    if (examResult) {
      setResult(examResult);
      toast.success("Assessment deployed successfully!");
    }
  };

  if (result) {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4 sm:px-6">
        <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm animate-fade-in">
          <div className="p-8 md:p-12 text-center border-b border-border bg-background">
            <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4 border border-success/20">
              <CheckCircle className="w-6 h-6 text-success" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight mb-2">Deployment Successful</h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Your assessment session is now live. Share the secure access code with your students to begin.
            </p>
          </div>

          <div className="p-8 md:p-12 bg-muted/10 flex flex-col items-center">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-3">Access Code</p>
            <div className="bg-background border border-border rounded-md px-8 py-4 mb-8 shadow-sm">
              <span className="text-4xl font-mono font-medium tracking-widest text-foreground">{result.examCode}</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <button
                onClick={() => { navigator.clipboard.writeText(result.examCode); toast.success("Copied to clipboard"); }}
                className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-background border border-border text-foreground text-sm font-medium rounded-md hover:bg-muted transition-colors shadow-sm"
              >
                <Copy className="w-4 h-4" />
                Copy Code
              </button>
              <button
                onClick={() => router.push(`/admin/exams/${result.examId}`)}
                className="h-10 px-6 inline-flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity shadow-sm"
              >
                Go to Dashboard
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-fade-in pb-20">
      <div className="flex items-center gap-3 pb-6 border-b border-border">
        <button onClick={() => router.push('/admin')} className="w-8 h-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Deploy Assessment</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Configure session parameters and upload question payload.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Assessment Identity</h2>
            </div>

            <div className="p-5 space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Title</label>
                <input
                  autoFocus
                  type="text"
                  value={title}
                  onBlur={() => handleBlur("title")}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`input w-full bg-background border-border focus:border-foreground focus:ring-0 ${touched.title && !title.trim() ? "border-danger" : ""}`}
                  placeholder="e.g. Modern Full-stack Proficiency Exam"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Duration (Minutes)</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={duration}
                      onBlur={() => handleBlur("duration")}
                      onChange={(e) => setDuration(e.target.value === "" ? "" : Number(e.target.value))}
                      className={`input w-full bg-background border-border focus:border-foreground focus:ring-0 ${touched.duration && Number(duration) < 5 ? "border-danger" : ""}`}
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="Min 5m"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground">Capacity</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input
                      type="number"
                      value={capacity}
                      onBlur={() => handleBlur("capacity")}
                      onChange={(e) => setCapacity(e.target.value === "" ? "" : Math.min(300, Number(e.target.value)))}
                      className={`input w-full bg-background border-border focus:border-foreground focus:ring-0 ${touched.capacity && (Number(capacity) < 1 || Number(capacity) > 300) ? "border-danger" : ""}`}
                      style={{ paddingLeft: '2.25rem' }}
                      placeholder="Max 300"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-muted-foreground" />
                <h2 className="text-sm font-semibold">Question Payload</h2>
              </div>
              {isValidated && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-success/10 text-success text-[10px] font-medium uppercase tracking-wider">
                  <CheckCircle className="w-3 h-3" /> Validated
                </div>
              )}
            </div>

            <div className="p-5">
              <label className={`relative flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                isValidated ? "border-success/30 bg-success/5" : "border-border hover:border-muted-foreground/50 bg-muted/10 hover:bg-muted/30"
              }`}>
                <div className="w-10 h-10 rounded-md bg-background border border-border flex items-center justify-center mb-3 shadow-sm">
                  {isValidated ? <FileJson className="w-5 h-5 text-success" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                </div>
                <p className="text-sm font-medium text-foreground mb-1">Select JSON Dataset</p>
                <p className="text-xs text-muted-foreground max-w-[250px] text-center">Click to upload or drag and drop</p>
                <input type="file" accept=".json" onChange={handleFileInputChange} className="hidden" />
              </label>

              {validationErrors.length > 0 && (
                <div className="mt-5 border border-danger/20 rounded-md overflow-hidden bg-background">
                  <div className="px-4 py-2.5 bg-danger-muted border-b border-danger/10 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-danger" />
                    <span className="text-xs font-medium text-danger">{validationErrors.length} Schema Violations</span>
                  </div>
                  <div className="max-h-60 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                    {validationErrors.map((err) => (
                      <div key={err.index} className="flex gap-3 text-sm">
                        <span className="font-mono text-muted-foreground w-8 shrink-0">Q{err.index + 1}</span>
                        <div className="space-y-1">
                          {err.errors.map((e, idx) => (
                            <p key={idx} className="text-danger text-xs">{e}</p>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {isValidated && validatedQuestions && (
                <div className="mt-5 pt-5 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Payload Summary</div>
                  <div className="flex flex-col">
                    {Object.entries(topicSummary).map(([topic, count], index, arr) => (
                      <div key={topic} className={`flex items-center justify-between py-1.5 ${index !== arr.length - 1 ? 'border-b border-border/40' : ''}`}>
                        <span className="text-sm text-muted-foreground">{topic}</span>
                        <span className="text-sm font-medium text-foreground">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="lg:col-span-1">
          <div className="sticky top-24 border border-border rounded-lg bg-card shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-border bg-muted/30 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Deployment Summary</h3>
            </div>

            <div className="p-5 space-y-6">
              <div className="space-y-4 text-sm">
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Title</span>
                  <span className={`font-medium truncate max-w-[150px] ${!title ? 'text-muted-foreground/30 italic' : 'text-foreground'}`}>
                    {title || "Untitled"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Duration</span>
                  <span className={`font-medium ${!duration ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                    {duration ? `${duration} min` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Capacity</span>
                  <span className={`font-medium ${!capacity ? 'text-muted-foreground/30' : Number(capacity) > 300 ? 'text-danger' : 'text-foreground'}`}>
                    {capacity ? `${capacity} seats` : "—"}
                  </span>
                </div>
                <div className="flex justify-between items-center border-b border-border pb-2">
                  <span className="text-muted-foreground">Questions</span>
                  <span className={`font-medium ${!isValidated ? 'text-muted-foreground/30' : 'text-foreground'}`}>
                    {validatedQuestions?.length || "—"}
                  </span>
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-md bg-danger-muted border border-danger/20 text-danger text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <button
                disabled={!isFormValid || loading}
                onClick={handleCreate}
                className="w-full h-10 flex items-center justify-center gap-2 bg-foreground text-background text-sm font-medium rounded-md hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Deploying...
                  </>
                ) : (
                  "Deploy Assessment"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}