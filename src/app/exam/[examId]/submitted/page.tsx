"use client";

import { FloatingThemeToggle } from "@/components/FloatingThemeToggle";
import { getDefaultFileName, parseCodeFilesPayload } from "@/lib/code-answer";
import { createClient } from "@/lib/supabase/browser";
import { useState, useEffect, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { 
  Check, Clock, Trophy, X, AlertCircle, 
  Calendar, ChevronDown, ChevronUp, Code, FileText, Terminal, PlayCircle 
} from "lucide-react";

interface Option {
  id: string;
  text: string;
}

interface ResultItem {
  id: string;
  position: number;
  points: number;
  topic: string;
  questionType: string;
  challengeMode: "function" | "component" | null;
  question: string;
  codeSnippet: string | null;
  options: Option[];
  correctOptionId: string | null;
  explanation: string;
  selectedOptionId: string | null;
  codeAnswer: string | null;
  testPassCount: number;
  testFailCount: number;
  testTotalCount: number;
  isSkipped: boolean;
  isCorrect: boolean | null;
}

function isProgrammingResult(result: ResultItem) {
  return result.questionType === "programming";
}

function hasAnswered(result: ResultItem) {
  return isProgrammingResult(result)
    ? !!result.codeAnswer?.trim()
    : !!result.selectedOptionId;
}

function isSkippedResult(result: ResultItem) {
  return result.isSkipped ?? !hasAnswered(result);
}

function isCorrectResult(result: ResultItem, isPublished: boolean) {
  if (!isPublished) return false;
  if (typeof result.isCorrect === "boolean") return result.isCorrect;
  return (
    !isProgrammingResult(result) &&
    !!result.selectedOptionId &&
    result.selectedOptionId === result.correctOptionId
  );
}

function isIncorrectResult(result: ResultItem, isPublished: boolean) {
  return isPublished && hasAnswered(result) && !isCorrectResult(result, isPublished);
}

function getCodeFiles(result: ResultItem) {
  const parsedFiles = parseCodeFilesPayload(result.codeAnswer);
  if (parsedFiles?.length) return parsedFiles;

  return [
    {
      name: getDefaultFileName(result.challengeMode || "function"),
      language: "javascript" as const,
      content: result.codeAnswer || "",
    },
  ];
}

function formatDuration(seconds: number) {
  if (!seconds || isNaN(seconds)) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function QuestionRow({ result: r, index: idx, isPublished, isExpanded, onToggle }: { result: ResultItem; index: number; isPublished: boolean; isExpanded: boolean; onToggle: () => void; }) {
  const isProgramming = isProgrammingResult(r);
  const isCorrect = isCorrectResult(r, isPublished);
  const isWrong = isIncorrectResult(r, isPublished);
  const isSkipped = isSkippedResult(r);
  const codeFiles = isProgramming ? getCodeFiles(r) : [];

  return (
    <div className="group bg-transparent">
      {/* Row Summary */}
      <div 
        onClick={onToggle}
        className="flex items-center gap-4 p-3 hover:bg-muted/30 cursor-pointer transition-colors text-sm"
      >
        <div className="w-6 text-right text-muted-foreground font-mono text-xs shrink-0">
          {idx + 1}.
        </div>
        
        {isPublished ? (
          <div className="shrink-0 w-5 flex justify-center">
             {isCorrect ? <Check className="w-4 h-4 text-success" /> : isSkipped ? <AlertCircle className="w-4 h-4 text-muted-foreground" /> : <X className="w-4 h-4 text-danger" />}
          </div>
        ) : (
          <div className="shrink-0 w-5 flex justify-center">
             <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
          </div>
        )}

        <div className="flex-1 truncate font-medium text-foreground">
           {r.question}
        </div>

        <div className="shrink-0 hidden md:flex items-center gap-3 text-xs">
           <span className="text-muted-foreground capitalize w-20 truncate">{r.questionType}</span>
           <span className="font-mono text-muted-foreground w-12 text-right">{r.points} pt</span>
        </div>

        <div className="shrink-0 w-5 flex justify-center text-muted-foreground group-hover:text-foreground transition-colors">
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="p-4 pl-14 pr-4 border-t border-border/50 bg-muted/10 pb-6 space-y-6">
           <div className="text-sm leading-relaxed text-foreground/90 font-medium">
             {r.question}
           </div>

           {/* Code Snippet */}
           {r.codeSnippet && (
             <div className="rounded-md border border-border bg-[#0d1117] overflow-hidden">
               <div className="bg-[#161b22] px-3 py-1.5 border-b border-border flex items-center gap-2">
                 <Terminal className="w-3.5 h-3.5 text-muted-foreground" />
                 <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-wider">Reference Code</span>
               </div>
               <pre className="p-4 overflow-x-auto text-xs text-[#e6edf3] font-mono leading-relaxed">
                 <code>{r.codeSnippet}</code>
               </pre>
             </div>
           )}

           {/* Programming Answer */}
           {isProgramming && (
             <div className="space-y-4">
               {isPublished && !isSkipped && (
                 <div className="flex items-center gap-4 text-xs font-mono">
                   <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                     <PlayCircle className="w-4 h-4 text-muted-foreground" />
                     <span className="text-muted-foreground">Test Cases:</span>
                     <span className={isCorrect ? "text-success font-semibold" : isWrong ? "text-danger font-semibold" : "font-semibold"}>
                       {r.testPassCount}/{r.testTotalCount || 0}
                     </span>
                   </div>
                 </div>
               )}

               {isSkipped ? (
                 <div className="text-sm text-muted-foreground flex items-center gap-2 italic">
                   <AlertCircle className="w-4 h-4" />
                   No code was submitted.
                 </div>
               ) : (
                 <div className="space-y-3">
                   {codeFiles.map((file) => (
                     <div key={file.name} className="rounded-md border border-border bg-[#0d1117] overflow-hidden">
                       <div className="bg-[#161b22] px-3 py-1.5 border-b border-border flex items-center gap-2">
                         <Code className="w-3.5 h-3.5 text-muted-foreground" />
                         <span className="text-[10px] font-mono text-muted-foreground">{file.name}</span>
                       </div>
                       <pre className="p-4 overflow-x-auto text-xs text-[#e6edf3] font-mono leading-relaxed">
                         <code>{file.content || "// Empty"}</code>
                       </pre>
                     </div>
                   ))}
                 </div>
               )}
             </div>
           )}

           {/* Multiple Choice Options */}
           {!isProgramming && (
             <div className="space-y-2">
               {r.options.map((opt) => {
                 const isUserChoice = opt.id === r.selectedOptionId;
                 const isTheCorrectAnswer = isPublished && opt.id === r.correctOptionId;

                 let itemClasses = "flex items-start gap-3 p-3 rounded border text-sm transition-colors ";
                 if (isTheCorrectAnswer) {
                   itemClasses += "bg-success/10 border-success/30 text-success-foreground font-medium";
                 } else if (isUserChoice && isWrong) {
                   itemClasses += "bg-danger/10 border-danger/30 text-danger-foreground";
                 } else if (isUserChoice && !isPublished) {
                   itemClasses += "bg-muted border-border font-medium";
                 } else {
                   itemClasses += "bg-transparent border-transparent text-muted-foreground hover:bg-muted/50";
                 }

                 return (
                   <div key={opt.id} className={itemClasses}>
                     <div className="w-5 h-5 shrink-0 flex items-center justify-center border border-current rounded-sm text-xs font-mono opacity-70">
                       {opt.id}
                     </div>
                     <div className="flex-1 pt-0.5">
                       {opt.text}
                     </div>
                     {isUserChoice && (
                       <div className="text-[10px] uppercase tracking-wider font-semibold opacity-70 shrink-0 pt-1">
                         {isTheCorrectAnswer ? 'Correct' : isWrong ? 'Your Answer' : 'Selected'}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           )}

           {/* Explanation */}
           {isPublished && r.explanation && (
             <div className="rounded-md bg-muted/40 border border-border/50 p-4">
               <h4 className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Explanation</h4>
               <p className="text-sm text-foreground/80 leading-relaxed">{r.explanation}</p>
             </div>
           )}
        </div>
      )}
    </div>
  );
}

export default function Submitted({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = use(params);
  const [submittedAt, setSubmittedAt] = useState("");
  const [serverStartedAt, setServerStartedAt] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [maxScore, setMaxScore] = useState<number | null>(null);
  const [rank, setRank] = useState<number | null>(null);
  const [totalParticipants, setTotalParticipants] = useState<number>(0);
  const [examTitle, setExamTitle] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [isPublished, setIsPublished] = useState(false);
  const router = useRouter();

  const [results, setResults] = useState<ResultItem[]>([]);
  const [filter, setFilter] = useState<"All" | "Correct" | "Incorrect" | "Skipped">("All");
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

  const allExpanded = results.length > 0 && results.every(r => expandedRows[r.id]);

  const toggleExpandAll = () => {
    if (allExpanded) {
      setExpandedRows({});
    } else {
      const newExpanded: Record<string, boolean> = {};
      results.forEach(r => {
        newExpanded[r.id] = true;
      });
      setExpandedRows(newExpanded);
    }
  };

  useEffect(() => {
    if (typeof document !== "undefined" && document.fullscreenElement) {
      document.exitFullscreen().catch((err) => console.log("Fullscreen exit error:", err));
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [initRes, resultsRes] = await Promise.all([
        fetch(`/api/exam/${examId}/submitted-init`),
        fetch(`/api/exam/${examId}/results`)
      ]);

      if (!initRes.ok) {
        if (initRes.status === 401) return router.push("/login");
        if (initRes.status === 404) {
          toast.error("This exam is no longer available.");
          return router.push("/exam/join");
        }
        return;
      }

      const data = await initRes.json();
      const { attempt, exam } = data;

      if (exam) {
        setExamTitle(exam.title);
      }

      if (attempt) {
        setScore(attempt.total_score);
        setMaxScore(attempt.max_score);
        setRank(attempt.rank);
        setTotalParticipants(attempt.totalParticipants);
        if (attempt.server_started_at) setServerStartedAt(attempt.server_started_at);
        if (attempt.submitted_at) setSubmittedAt(new Date(attempt.submitted_at).toLocaleString());
      }

      if (resultsRes.ok) {
        const resultsData = await resultsRes.json();
        setResults(resultsData.results || []);
        setIsPublished(resultsData.isPublished || false);
      }

      setLoading(false);
    } catch (err) {
      console.error("Failed to load submitted data:", err);
      setLoading(false);
    }
  }, [examId, router]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`exam-submitted-realtime-${examId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "exams", filter: `id=eq.${examId}` },
        (payload) => {
          if (payload.new.status === "closed") {
            loadData();
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [examId, loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center">
        <div className="w-5 h-5 border-2 border-muted-foreground border-t-foreground rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground tracking-tight">Loading results...</p>
      </div>
    );
  }

  const percentage = maxScore ? Math.round(((score || 0) / maxScore) * 100) : 0;
  const isPass = percentage >= 40;
  
  let durationSecs = 0;
  if (serverStartedAt && submittedAt) {
    durationSecs = (new Date(submittedAt).getTime() - new Date(serverStartedAt).getTime()) / 1000;
  }

  const filteredResults = results.filter((r) => {
    if (filter === "All") return true;
    if (!isPublished) {
      if (filter === "Skipped") return isSkippedResult(r);
      return true;
    }
    if (filter === "Correct") return isCorrectResult(r, isPublished);
    if (filter === "Incorrect") return isIncorrectResult(r, isPublished);
    if (filter === "Skipped") return isSkippedResult(r);
    return true;
  });

  return (
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-accent/20 pb-20">
      <FloatingThemeToggle />
      
      <main className="max-w-4xl mx-auto px-4 md:px-6 pt-12 md:pt-20">
        
        {/* TOP ACTIONS */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/exam/join")}
            className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronDown className="w-4 h-4 mr-1 rotate-90" />
            Back to Dashboard
          </button>
        </div>

        {/* TOP SUMMARY SECTION */}
        <header className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">{examTitle || "Assessment"}</h1>
              {isPublished && (
                <span className={`px-2 py-0.5 rounded text-[11px] font-semibold uppercase tracking-wider ${
                  isPass ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger'
                }`}>
                  {isPass ? 'Passed' : 'Failed'}
                </span>
              )}
              {!isPublished && (
                <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-muted text-muted-foreground uppercase tracking-wider">
                  Pending Results
                </span>
              )}
            </div>
            
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground font-mono">
              {submittedAt && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 opacity-70" />
                  <span>{submittedAt}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-70" />
                <span>{formatDuration(durationSecs)}</span>
              </div>
              {rank !== null && (
                <div className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 opacity-70" />
                  <span>Rank #{rank} / {totalParticipants}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 opacity-70" />
                <span>{results.length} Questions</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 md:text-right">
            <div className="flex flex-col md:items-end">
              <div className="text-4xl font-light tracking-tighter flex items-baseline gap-1">
                {isPublished ? percentage : '—'}<span className="text-lg text-muted-foreground font-medium">%</span>
              </div>
              <div className="text-xs text-muted-foreground font-medium mt-1 uppercase tracking-wider">
                {isPublished ? `${score ?? 0} / ${maxScore ?? 0} POINTS` : 'Awaiting Grade'}
              </div>
            </div>
            {/* Minimal Progress Bar */}
            <div className="w-1.5 h-16 bg-muted rounded-full overflow-hidden shrink-0">
              <div 
                className={`w-full rounded-full transition-all duration-1000 ${isPass ? 'bg-success' : 'bg-danger'}`} 
                style={{ height: isPublished ? `${percentage}%` : '0%', marginTop: isPublished ? `${100 - percentage}%` : '100%' }} 
              />
            </div>
          </div>
        </header>

        {/* QUESTION BREAKDOWN SECTION */}
        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <div className="flex items-center gap-4">
              <h2 className="text-sm font-semibold tracking-tight">Question Breakdown</h2>
              <div className="flex items-center gap-1 border-l border-border pl-4">
                <button onClick={toggleExpandAll} className="text-xs font-medium text-muted-foreground hover:text-foreground px-2 py-1 rounded transition-colors hover:bg-muted/50">
                  {allExpanded ? 'Collapse All' : 'Expand All'}
                </button>
              </div>
            </div>
            
            {isPublished && (
              <div className="flex gap-2">
                {(["All", "Correct", "Incorrect", "Skipped"] as const).map((f) => {
                  const count = results.filter((r) => {
                    if (f === "All") return true;
                    if (!isPublished && f === "Skipped") return isSkippedResult(r);
                    if (f === "Correct") return isCorrectResult(r, isPublished);
                    if (f === "Incorrect") return isIncorrectResult(r, isPublished);
                    if (f === "Skipped") return isSkippedResult(r);
                    return true;
                  }).length;
                  
                  return (
                    <button
                      key={f}
                      onClick={() => setFilter(f)}
                      className={`text-xs font-medium px-2 py-1 rounded transition-colors ${
                        filter === f 
                          ? 'bg-muted text-foreground' 
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      {f} <span className="opacity-50 ml-1">({count})</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="border border-border rounded-lg bg-card overflow-hidden shadow-sm">
            <div className="divide-y divide-border">
              {filteredResults.map((r, idx) => (
                <QuestionRow 
                  key={r.id} 
                  result={r} 
                  index={idx} 
                  isPublished={isPublished} 
                  isExpanded={!!expandedRows[r.id]}
                  onToggle={() => setExpandedRows(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                />
              ))}
              
              {filteredResults.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground bg-background">
                  No questions match the selected filter.
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
