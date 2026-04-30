import type { Question } from "@/lib/quizTypes";

interface QuestionListProps {
  groupedQuestions: Record<string, Question[]>;
  selectedExamName: string;
  handleEdit: (q: Question) => void;
  handleDelete: (id: string) => void;
}

export function QuestionList({
  groupedQuestions,
  selectedExamName,
  handleEdit,
  handleDelete,
}: QuestionListProps) {
  if (selectedExamName === "") {
    return (
      <div className="glass-card p-12 text-center border-border">
        <svg
          className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
          />
        </svg>
        <h3 className="text-lg font-bold text-foreground">
          Please select from dropdown
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Select an exam from the dropdown above to view its question bank.
        </p>
      </div>
    );
  }

  const examsToRender =
    selectedExamName === "All"
      ? Object.entries(groupedQuestions)
      : Object.entries(groupedQuestions).filter(
          ([examName]) => examName === selectedExamName
        );

  if (examsToRender.length === 0) {
    return (
      <div className="glass-card p-12 text-center border-border">
        <svg
          className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-50"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1}
            d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
          />
        </svg>
        <h3 className="text-lg font-bold text-foreground">
          No Questions Found
        </h3>
        <p className="text-muted-foreground text-sm mt-1">
          Add some questions to populate the databanks.
        </p>
      </div>
    );
  }

  return (
    <>
      {examsToRender.map(([examName, qs]) => (
        <div
          key={examName}
          className="glass-card overflow-hidden animate-fade-in shadow-sm border border-border"
        >
          <div className="bg-card-hover px-4 sm:px-6 py-4 border-b border-border flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-sm font-bold text-foreground break-words">
              {examName}
            </h2>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
              {qs.length} Question{qs.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm text-left">
              <thead className="bg-card/30">
                <tr className="border-b border-border/50">
                  <th className="p-4 text-muted-foreground font-medium w-1/2">
                    Question
                  </th>
                  <th className="p-4 text-muted-foreground font-medium">Topic</th>
                  <th className="p-4 text-muted-foreground font-medium">
                    Difficulty
                  </th>
                  <th className="p-4 text-muted-foreground font-medium text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {qs.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-border/30 hover:bg-card-hover transition-colors"
                  >
                    <td className="p-4">
                      <p className="text-foreground font-medium line-clamp-1">
                        {q.question}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1 font-mono tracking-wide">
                        {q.id}
                      </p>
                    </td>
                    <td className="p-4">
                      <span className="text-xs px-2 py-1 rounded-lg bg-border/50 text-muted-foreground font-medium tracking-wide">
                        {q.topic}
                      </span>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg ${
                          q.difficulty === "Intermediate"
                            ? "bg-warning/10 text-warning"
                            : "bg-success/10 text-success"
                        }`}
                      >
                        {q.difficulty}
                      </span>
                      {q.question_type === "programming" && (
                        <span className="ml-2 text-[10px] uppercase font-bold tracking-wider px-2 py-1 rounded-lg bg-primary/10 text-primary">
                          Code
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleEdit(q)}
                          className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-primary hover:border-primary/50 transition-all"
                          title="Edit"
                        >
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
                              d="M11 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-5M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                            />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(q.id)}
                          className="p-2 bg-background border border-border rounded-lg text-muted-foreground hover:text-danger hover:border-danger/50 hover:bg-danger/5 transition-all"
                          title="Delete"
                        >
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
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </>
  );
}
