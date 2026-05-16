import type {
  ChallengeMode,
  Question,
  Option,
  TestCase,
} from "@/lib/quizTypes";

function getFunctionInput(testCase: TestCase) {
  return "input" in testCase && Array.isArray(testCase.input)
    ? testCase.input
    : [];
}

function getFunctionExpected(testCase: TestCase) {
  return "expected" in testCase ? testCase.expected : "";
}

interface QuestionFormModalProps {
  form: Partial<Question>;
  setForm: React.Dispatch<React.SetStateAction<Partial<Question>>>;
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  editingId: string | null;
  setShowAdd: (show: boolean) => void;
  submitting: boolean;
}

export function QuestionFormModal({
  form,
  setForm,
  handleSubmit,
  editingId,
  setShowAdd,
  submitting,
}: QuestionFormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div
        className="card p-6 sm:p-8 w-full max-w-2xl my-8"
        role="dialog"
        aria-modal="true"
        aria-labelledby="question-form-title"
      >
        <h2
          id="question-form-title"
          className="text-xl font-bold text-foreground mb-6"
        >
          {editingId ? "Edit Question" : "Add New Question"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="question-topic"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Topic
              </label>
              <input
                id="question-topic"
                type="text"
                value={form.topic || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, topic: e.target.value }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
                required
              />
            </div>
            <div>
              <label
                htmlFor="question-difficulty"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Difficulty
              </label>
              <select
                id="question-difficulty"
                value={form.difficulty || "Basic"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    difficulty: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
              >
                <option value="Basic">Basic</option>
                <option value="Intermediate">Intermediate</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="question-type"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Question Type
              </label>
              <select
                id="question-type"
                value={form.question_type || "theory"}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    question_type: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
              >
                <option value="theory">Theory (MCQ)</option>
                <option value="code-output">Code Output (MCQ)</option>
                <option value="programming">Programming Challenge</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="question-points"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Points
              </label>
              <input
                id="question-points"
                type="number"
                min={1}
                value={form.points || 1}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    points: parseInt(e.target.value) || 1,
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
              />
            </div>
          </div>

          {form.question_type === "code-output" && (
            <div>
              <label
                htmlFor="question-code-snippet"
                className="block text-sm font-medium text-muted-foreground mb-1"
              >
                Code Snippet
              </label>
              <textarea
                id="question-code-snippet"
                value={form.code_snippet || ""}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    code_snippet: e.target.value,
                  }))
                }
                className="w-full px-4 py-2.5 rounded bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:border-primary transition-all min-h-[150px]"
                placeholder="Enter React/JSX code here..."
              />
            </div>
          )}

          <div>
            <label
              htmlFor="question-text"
              className="block text-sm font-medium text-muted-foreground mb-1"
            >
              Question Text
            </label>
            <textarea
              id="question-text"
              value={form.question || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, question: e.target.value }))
              }
              className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all min-h-[100px]"
              placeholder={
                form.question_type === "programming"
                  ? "Describe the programming task..."
                  : "Enter the question..."
              }
              required
            />
          </div>

          {/* Programming question fields */}
          {form.question_type === "programming" && (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="challenge-mode"
                    className="block text-sm font-medium text-muted-foreground mb-1"
                  >
                    Challenge Mode
                  </label>
                  <select
                    id="challenge-mode"
                    value={form.challenge_mode || "function"}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        challenge_mode: e.target.value as ChallengeMode,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all"
                  >
                    <option value="function">JavaScript Function</option>
                    <option value="component">React Component</option>
                  </select>
                </div>
                <div>
                  <label
                    htmlFor="function-name"
                    className="block text-sm font-medium text-muted-foreground mb-1"
                  >
                    Function Name
                  </label>
                  <input
                    id="function-name"
                    type="text"
                    value={form.function_name || ""}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        function_name: e.target.value,
                      }))
                    }
                    className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all font-mono"
                    placeholder="e.g. add, fibonacci"
                    required
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="starter-code"
                  className="block text-sm font-medium text-muted-foreground mb-1"
                >
                  Starter Code
                </label>
                <textarea
                  id="starter-code"
                  value={form.starter_code || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      starter_code: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded bg-background border border-border font-mono text-sm text-foreground focus:outline-none focus:border-primary transition-all min-h-[150px]"
                  placeholder={`function ${form.function_name || "solution"}(a, b) {\n  // Write your code here\n}`}
                  required
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-muted-foreground">
                    Test Cases
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      const tcs = [...(form.test_cases || [])];
                      tcs.push({
                        id: `tc${tcs.length + 1}`,
                        name: `Test ${tcs.length + 1}`,
                        input: [],
                        expected: "",
                      });
                      setForm((prev) => ({ ...prev, test_cases: tcs }));
                    }}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    + Add Test Case
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.test_cases || []).map((tc: TestCase, idx: number) => (
                    <div
                      key={tc.id}
                      className="p-3 rounded bg-background border border-border space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-muted-foreground">
                          #{idx + 1}
                        </span>
                        <input
                          type="text"
                          value={tc.name}
                          onChange={(e) => {
                            const tcs = [...(form.test_cases || [])];
                            tcs[idx] = { ...tcs[idx], name: e.target.value };
                            setForm((prev) => ({ ...prev, test_cases: tcs }));
                          }}
                          className="flex-1 px-3 py-1.5 rounded-lg bg-card border border-border text-sm text-foreground focus:outline-none focus:border-primary"
                          placeholder="Test name"
                        />
                        {(form.test_cases || []).length > 1 && (
                          <button
                            type="button"
                            aria-label={`Remove test case ${idx + 1}`}
                            onClick={() => {
                              const tcs = (form.test_cases || []).filter(
                                (_: TestCase, i: number) => i !== idx,
                              );
                              setForm((prev) => ({ ...prev, test_cases: tcs }));
                            }}
                            className="p-1 text-danger hover:bg-danger/10 rounded"
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
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Input (JSON array)
                          </label>
                          <input
                            type="text"
                            value={JSON.stringify(getFunctionInput(tc))}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                const tcs = [...(form.test_cases || [])];
                                tcs[idx] = {
                                  ...tcs[idx],
                                  input: Array.isArray(parsed)
                                    ? parsed
                                    : [parsed],
                                } as TestCase;
                                setForm((prev) => ({
                                  ...prev,
                                  test_cases: tcs,
                                }));
                              } catch {
                                /* ignore invalid JSON while typing */
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                            placeholder="[2, 3]"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Expected (JSON)
                          </label>
                          <input
                            type="text"
                            value={JSON.stringify(
                              getFunctionExpected(tc) ?? "",
                            )}
                            onChange={(e) => {
                              try {
                                const parsed = JSON.parse(e.target.value);
                                const tcs = [...(form.test_cases || [])];
                                tcs[idx] = {
                                  ...tcs[idx],
                                  expected: parsed,
                                } as TestCase;
                                setForm((prev) => ({
                                  ...prev,
                                  test_cases: tcs,
                                }));
                              } catch {
                                /* ignore invalid JSON while typing */
                              }
                            }}
                            className="w-full px-3 py-1.5 rounded-lg bg-card border border-border text-sm font-mono text-foreground focus:outline-none focus:border-primary"
                            placeholder="5"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* MCQ-only fields */}
          {form.question_type !== "programming" && (
            <>
              <div className="space-y-3">
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Options
                </label>
                {(form.options || []).map((opt: Option, idx: number) => (
                  <div key={opt.id} className="flex items-center gap-3">
                    <span
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        form.correct_option_id === opt.id
                          ? "bg-success text-primary-foreground"
                          : "bg-border text-muted-foreground"
                      }`}
                    >
                      {opt.id}
                    </span>
                    <input
                      type="text"
                      aria-label={`Option ${opt.id} text`}
                      value={opt.text}
                      onChange={(e) => {
                        const newOpts = [...(form.options || [])];
                        newOpts[idx].text = e.target.value;
                        setForm((prev) => ({ ...prev, options: newOpts }));
                      }}
                      className="flex-1 px-4 py-2 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all text-sm"
                      placeholder={`Option ${opt.id}...`}
                      required
                    />
                    <input
                      type="radio"
                      name="correct"
                      aria-label={`Mark option ${opt.id} as correct`}
                      checked={form.correct_option_id === opt.id}
                      onChange={() =>
                        setForm((prev) => ({
                          ...prev,
                          correct_option_id: opt.id,
                        }))
                      }
                      className="w-4 h-4 text-primary focus:ring-primary"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-1">
                  Explanation
                </label>
                <textarea
                  value={form.explanation || ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      explanation: e.target.value,
                    }))
                  }
                  className="w-full px-4 py-2.5 rounded bg-background border border-border text-foreground focus:outline-none focus:border-primary transition-all min-h-[80px]"
                  required
                />
              </div>
            </>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-3 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary-hover transition-all disabled:bg-muted disabled:text-muted-foreground disabled:cursor-not-allowed"
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <div
                    className="spinner border-white"
                    style={{ width: 20, height: 20 }}
                  />
                  Saving...
                </div>
              ) : editingId ? (
                "Update Question"
              ) : (
                "Save Question"
              )}
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-6 py-3 rounded bg-card border border-border text-foreground hover:bg-card-hover transition-all"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
