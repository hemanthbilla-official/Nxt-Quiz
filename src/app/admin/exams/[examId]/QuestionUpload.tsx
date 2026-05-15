import { ExamData } from "./types";

interface QuestionUploadProps {
  exam: ExamData;
  waitingCount: number;
  isImporting: boolean;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function QuestionUpload({
  exam,
  waitingCount,
  isImporting,
  onImport,
}: QuestionUploadProps) {
  if (exam.status !== "waiting") return null;

  return (
    <div className="card p-6 bg-card border-accent/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1">
          <h3 className="text-lg font-bold text-foreground">
            Exam Questions
          </h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {(exam.questionsCount || 0) > 0
              ? `${exam.questionsCount} questions are currently loaded for this exam.`
              : "No questions loaded yet. You must upload a JSON file before starting."}
          </p>
        </div>
        <label
          className={`cursor-pointer flex-shrink-0 btn-primary h-11 px-8 ${
            isImporting ? "opacity-70 pointer-events-none" : ""
          }`}
        >
          {isImporting ? (
            <>
              <div className="spinner" style={{ width: 14, height: 14 }} />
              <span>Uploading...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span>
                {exam.questionsCount && exam.questionsCount > 0
                  ? "Replace JSON"
                  : "Upload JSON"}
              </span>
            </>
          )}
          <input
            type="file"
            accept=".json"
            onChange={onImport}
            className="hidden"
            disabled={isImporting}
          />
        </label>
      </div>
      {(exam.questionsCount || 0) === 0 && waitingCount > 0 && (
        <div className="mt-5 p-4 rounded-xl bg-warning-muted border border-warning/20 flex items-center gap-3 text-warning text-sm font-medium">
          <svg
            className="w-5 h-5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
          <span>
            Students are waiting, but you cannot start until questions
            are uploaded.
          </span>
        </div>
      )}
    </div>
  );
}
