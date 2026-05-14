"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import * as prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import postcssPlugin from "prettier/plugins/postcss";
import CodeEditor from "@/components/CodeEditor/CodeEditor";
import TestCasePanel from "@/components/CodeEditor/TestCasePanel";
import {
  createInitialCodeFiles,
  getLanguageFromFileName,
  isValidEditorFileName,
  MAX_EDITOR_FILES,
  serializeCodeAnswer,
} from "@/lib/code-answer";
import { DEFAULT_EXAM_CONTROLS, type ExamControls } from "@/lib/exam-controls";
import type {
  ChallengeMode,
  ConsoleEntry,
  EditorFile,
  RunCodeResponse,
  TestCase,
} from "@/lib/editorTypes";

type ProgrammingQuestionProps = {
  questionId: string;
  challengeMode: ChallengeMode;
  starterCode: string;
  testCases: TestCase[];
  savedCode?: string;
  onCodeChange: (code: string) => void;
  examId: string;
  controls?: ExamControls;
  theme?: "dark" | "light";
};

type NewFileKind = "jsx" | "css";

const maxConsoleEntries = 100;
const defaultEditorFontSize = 13;
const minEditorFontSize = 11;
const maxEditorFontSize = 20;
const protectedComponentFiles = new Set(["App.jsx"]);

function getDefaultNewFileName(kind: NewFileKind, fileCount: number) {
  return kind === "css"
    ? `styles${fileCount}.css`
    : `components/Component${fileCount}.jsx`;
}

function toComponentName(fileName: string) {
  const baseName =
    fileName
      .split("/")
      .pop()
      ?.replace(/\.(?:js|jsx)$/i, "") || "Component";
  const candidate = baseName
    .replace(/(?:^|[-_])([A-Za-z0-9_$])/g, (_match, char: string) =>
      char.toUpperCase(),
    )
    .replace(/[^A-Za-z0-9_$]/g, "");

  if (!candidate) return "Component";
  return /^[A-Za-z_$]/.test(candidate) ? candidate : `Component${candidate}`;
}

function createStarterContent(fileName: string) {
  if (fileName.toLowerCase().endsWith(".css")) {
    return "";
  }

  const componentName = toComponentName(fileName);
  return `export default function ${componentName}() {\n  return null;\n}\n`;
}

export default function ProgrammingQuestion({
  questionId,
  challengeMode,
  starterCode,
  testCases,
  savedCode,
  onCodeChange,
  examId,
  controls = DEFAULT_EXAM_CONTROLS,
  theme = "dark",
}: ProgrammingQuestionProps) {
  // --- State ---
  const [files, setFiles] = useState<EditorFile[]>(() =>
    createInitialCodeFiles({ challengeMode, starterCode, savedCode }),
  );
  const [activeFileName, setActiveFileName] = useState(
    files[0]?.name || "App.jsx",
  );
  const [consoleEntries, setConsoleEntries] = useState<ConsoleEntry[]>([]);
  const [isConsoleOpen, setIsConsoleOpen] = useState(false);
  const [runResults, setRunResults] = useState<RunCodeResponse | null>(null);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [runCooldown, setRunCooldown] = useState(0);
  const [editorPercent, setEditorPercent] = useState(55);
  const [editorFontSize, setEditorFontSize] = useState(defaultEditorFontSize);
  const [fileModalKind, setFileModalKind] = useState<NewFileKind | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [deleteFileName, setDeleteFileName] = useState<string | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [history, setHistory] = useState<EditorFile[][]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Refs
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cooldownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const filesRef = useRef(files);
  filesRef.current = files;
  const savedCodeRef = useRef(savedCode);
  savedCodeRef.current = savedCode;

  const activeFile = useMemo(
    () => files.find((file) => file.name === activeFileName) || files[0],
    [activeFileName, files],
  );

  useEffect(() => {
    if (!controls.codeConsoleEnabled) {
      setIsConsoleOpen(false);
    }
    if (!controls.codeFileActionsEnabled) {
      setFileModalKind(null);
    }
  }, [controls.codeConsoleEnabled, controls.codeFileActionsEnabled]);

  // --- Reset state when question changes ---
  // NOTE: savedCode is read via ref so that formatting/saving (which updates
  // the parent's savedCode prop) does not re-trigger this reset effect.
  useEffect(() => {
    const initialFiles = createInitialCodeFiles({
      challengeMode,
      starterCode,
      savedCode: savedCodeRef.current,
    });
    setFiles(initialFiles);
    filesRef.current = initialFiles;
    setActiveFileName(initialFiles[0]?.name || "App.jsx");
    setConsoleEntries([]);
    setRunResults(null);
    setIsRunningTests(false);
    setRunCooldown(0);
    setFileModalKind(null);
    setNewFileName("");
    setNewFileError("");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    challengeMode,
    questionId,
    starterCode,
  ]);

  const emitCodeChange = useCallback(
    (nextFiles: EditorFile[], immediate = false) => {
      const serialized = serializeCodeAnswer(nextFiles, challengeMode);

      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }

      if (immediate) {
        onCodeChange(serialized);
        return;
      }

      autosaveTimerRef.current = setTimeout(() => {
        onCodeChange(serialized);
      }, 2500);
    },
    [challengeMode, onCodeChange],
  );

  // --- Autosave (2-3 second debounce) ---
  const handleCodeChange = useCallback(
    (newCode: string) => {
      setHistory((prev) => [...prev.slice(-19), filesRef.current]);
      const nextFiles = filesRef.current.map((file) =>
        file.name === activeFileName ? { ...file, content: newCode } : file,
      );

      setFiles(nextFiles);
      filesRef.current = nextFiles;
      emitCodeChange(nextFiles);
    },
    [activeFileName, emitCodeChange],
  );

  // Cleanup autosave timer
  useEffect(() => {
    return () => {
      if (autosaveTimerRef.current) {
        clearTimeout(autosaveTimerRef.current);
      }
    };
  }, []);

  const openFileModal = useCallback((kind: NewFileKind) => {
    setFileModalKind(kind);
    setNewFileName(getDefaultNewFileName(kind, filesRef.current.length));
    setNewFileError(
      filesRef.current.length >= MAX_EDITOR_FILES
        ? `You can create up to ${MAX_EDITOR_FILES} files.`
        : "",
    );
  }, []);

  const closeFileModal = useCallback(() => {
    setFileModalKind(null);
    setNewFileName("");
    setNewFileError("");
  }, []);

  const createFileFromModal = useCallback(() => {
    if (!fileModalKind) return;

    const fileName = newFileName.trim();
    const lowerFileName = fileName.toLowerCase();

    if (filesRef.current.length >= MAX_EDITOR_FILES) {
      setNewFileError(`You can create up to ${MAX_EDITOR_FILES} files.`);
      return;
    }

    if (!fileName) {
      setNewFileError("Enter a file name.");
      return;
    }

    if (!isValidEditorFileName(fileName)) {
      setNewFileError("Use a relative file name ending in .js, .jsx, or .css.");
      return;
    }

    if (fileModalKind === "css" && !lowerFileName.endsWith(".css")) {
      setNewFileError("CSS files must end in .css.");
      return;
    }

    if (
      fileModalKind === "jsx" &&
      !lowerFileName.endsWith(".js") &&
      !lowerFileName.endsWith(".jsx")
    ) {
      setNewFileError("JavaScript files must end in .js or .jsx.");
      return;
    }

    if (filesRef.current.some((file) => file.name === fileName)) {
      setNewFileError("A file with that name already exists.");
      return;
    }

    const nextFiles = [
      ...filesRef.current,
      {
        name: fileName,
        language: getLanguageFromFileName(fileName),
        content: createStarterContent(fileName),
      },
    ];

    setFiles(nextFiles);
    filesRef.current = nextFiles;
    setActiveFileName(fileName);
    emitCodeChange(nextFiles, true);
    closeFileModal();
  }, [closeFileModal, emitCodeChange, fileModalKind, newFileName]);

  const deleteActiveFile = useCallback(() => {
    if (!activeFile || protectedComponentFiles.has(activeFile.name)) {
      return;
    }

    setHistory((prev) => [...prev.slice(-19), filesRef.current]);
    const nextFiles = filesRef.current.filter(
      (file) => file.name !== activeFile.name,
    );
    setFiles(nextFiles);
    filesRef.current = nextFiles;
    setActiveFileName(nextFiles[0]?.name || "App.jsx");
    emitCodeChange(nextFiles, true);
    setDeleteFileName(null);
  }, [activeFile, emitCodeChange]);

  const handleUndo = useCallback(() => {
    if (history.length === 0) return;
    const previousFiles = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setFiles(previousFiles);
    filesRef.current = previousFiles;
    emitCodeChange(previousFiles, true);
  }, [history, emitCodeChange]);

  const handleReset = useCallback(() => {
    setHistory((prev) => [...prev.slice(-19), filesRef.current]);
    const initialFiles = createInitialCodeFiles({
      challengeMode,
      starterCode,
      savedCode: savedCodeRef.current,
    });
    setFiles(initialFiles);
    filesRef.current = initialFiles;
    setActiveFileName(initialFiles[0]?.name || "App.jsx");
    emitCodeChange(initialFiles, true);
    setShowResetConfirm(false);
  }, [challengeMode, starterCode, emitCodeChange]);

  // --- Run Tests (calls server API → Edge Function) ---
  const runTests = useCallback(async () => {
    if (!controls.codeRunTestsEnabled || isRunningTests || runCooldown > 0)
      return;

    setIsRunningTests(true);
    setRunResults(null);

    // Flush current code to server before running
    const serializedAnswer = serializeCodeAnswer(
      filesRef.current,
      challengeMode,
    );
    onCodeChange(serializedAnswer);

    try {
      const res = await fetch(`/api/exam/${examId}/run-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          code: serializedAnswer,
          language: "javascript",
        }),
      });

      if (res.ok) {
        const data: RunCodeResponse = await res.json();
        setRunResults(data);
      } else {
        const errorData = await res.json().catch(() => ({}));
        setRunResults({
          success: false,
          results: [],
          summary: {
            passed: 0,
            failed: testCases.length,
            total: testCases.length,
          },
          error: errorData.error || "Failed to run tests",
        });
      }
    } catch {
      setRunResults({
        success: false,
        results: [],
        summary: {
          passed: 0,
          failed: testCases.length,
          total: testCases.length,
        },
        error: "Network error — could not reach the server",
      });
    } finally {
      setIsRunningTests(false);

      // Start cooldown
      setRunCooldown(3);
      cooldownTimerRef.current = setInterval(() => {
        setRunCooldown((prev) => {
          if (prev <= 1) {
            if (cooldownTimerRef.current) {
              clearInterval(cooldownTimerRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [
    challengeMode,
    controls.codeRunTestsEnabled,
    isRunningTests,
    runCooldown,
    examId,
    questionId,
    testCases.length,
    onCodeChange,
  ]);

  // Cleanup cooldown timer
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
  }, []);

  // --- Format code with Prettier ---
  const formatCode = useCallback(async () => {
    if (!controls.codeFormatEnabled || !activeFile) return;

    try {
      const formatted = await prettier.format(activeFile.content, {
        parser: activeFile.language === "css" ? "css" : "babel",
        plugins: [babelPlugin, estreePlugin, postcssPlugin],
        semi: true,
        trailingComma: "none",
      });
      const trimmed = formatted.trimEnd();
      const nextFiles = filesRef.current.map((file) =>
        file.name === activeFile.name ? { ...file, content: trimmed } : file,
      );
      setFiles(nextFiles);
      filesRef.current = nextFiles;
      emitCodeChange(nextFiles, true);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setConsoleEntries((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          level: "error" as const,
          message: `Format error: ${message}`,
          timestamp: new Date().toLocaleTimeString(),
        },
      ].slice(-maxConsoleEntries));
    }
  }, [activeFile, controls.codeFormatEnabled, emitCodeChange]);

  // --- Keyboard shortcuts ---
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (controls.codeFormatEnabled) {
          void formatCode();
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controls.codeFormatEnabled, formatCode]);

  // --- Resize handle ---
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const startResize = useCallback((event: React.PointerEvent<HTMLElement>) => {
    const workspace = workspaceRef.current;
    if (!workspace) return;

    event.currentTarget.setPointerCapture(event.pointerId);

    function updatePercent(e: PointerEvent) {
      const rect = workspace!.getBoundingClientRect();
      const nextPercent = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorPercent(Math.min(72, Math.max(28, nextPercent)));
    }

    function stopResize() {
      window.removeEventListener("pointermove", updatePercent);
      window.removeEventListener("pointerup", stopResize);
    }

    window.addEventListener("pointermove", updatePercent);
    window.addEventListener("pointerup", stopResize);
  }, []);

  // --- Status text ---
  const statusText = useMemo(() => {
    if (isRunningTests) return "Running tests...";
    if (runResults) {
      const { passed, total } = runResults.summary;
      return `${passed}/${total} tests passing`;
    }
    return "Ready";
  }, [isRunningTests, runResults]);

  const statusClass = useMemo(() => {
    if (runResults?.summary.failed === 0 && runResults.summary.passed > 0)
      return "pe-statusPass";
    if (runResults?.summary.failed) return "pe-statusFail";
    return "pe-statusReady";
  }, [runResults]);

  const workspaceStyle = {
    "--pe-editor-width": `${editorPercent}%`,
  } as CSSProperties;
  const editorPaneStyle = {
    "--pe-code-font-size": `${editorFontSize}px`,
  } as CSSProperties;

  const isComponentMode = challengeMode === "component";
  const isAtFileLimit = files.length >= MAX_EDITOR_FILES;

  return (
    <div className={`programming-editor ${isFullscreen ? "pe-fullscreen" : ""}`} data-theme={theme}>
      {/* Toolbar */}
      <div className="pe-toolbar">
        <div className="pe-toolbarLeft">
          <span className={`pe-status ${statusClass}`}>{statusText}</span>
        </div>
        <div className="pe-toolbarRight">
          {controls.codeRunTestsEnabled && (
            <button
              className="pe-btn pe-btnTest"
              type="button"
              onClick={runTests}
              disabled={isRunningTests || runCooldown > 0}
              title="Run test cases"
            >
              {isRunningTests
                ? "Running..."
                : runCooldown > 0
                  ? `Wait ${runCooldown}s`
                  : "▶ Run Tests"}
            </button>
          )}
          {controls.codeFormatEnabled && (
            <button
              className="pe-btn"
              type="button"
              onClick={formatCode}
              title="Format code (Ctrl+S)"
            >
              Format
            </button>
          )}
          <button
            className="pe-btn"
            type="button"
            onClick={handleUndo}
            disabled={history.length === 0}
            title="Undo last change"
          >
            Undo
          </button>
          <button
            className="pe-btn"
            type="button"
            onClick={() => setShowResetConfirm(true)}
            title="Reset to starter code"
          >
            Reset
          </button>
          {controls.codeZoomEnabled && (
            <div className="pe-codeZoom" aria-label="Code zoom controls">
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() =>
                  setEditorFontSize((size) =>
                    Math.max(minEditorFontSize, size - 1),
                  )
                }
                disabled={editorFontSize <= minEditorFontSize}
                title="Zoom code out"
                aria-label="Zoom code out"
              >
                -
              </button>
              <span className="pe-zoomValue" aria-label="Code font size">
                {editorFontSize}px
              </span>
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() =>
                  setEditorFontSize((size) =>
                    Math.min(maxEditorFontSize, size + 1),
                  )
                }
                disabled={editorFontSize >= maxEditorFontSize}
                title="Zoom code in"
                aria-label="Zoom code in"
              >
                +
              </button>
            </div>
          )}
          {controls.codeConsoleEnabled && (
            <button
              className="pe-btn pe-btnSmall"
              type="button"
              onClick={() => setIsConsoleOpen((v) => !v)}
              title={isConsoleOpen ? "Close console" : "Open console"}
            >
              Console
            </button>
          )}
          <button
            className="pe-btn pe-btnSmall"
            type="button"
            onClick={() => setIsFullscreen((v) => !v)}
            title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
          >
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>

      {/* Workspace */}
      <div ref={workspaceRef} className="pe-workspace" style={workspaceStyle}>
        {/* Editor panel */}
        <div className="pe-editorPanel">
          {isComponentMode && (
            <div className="pe-fileBar">
              <div
                className="pe-fileTabs"
                role="tablist"
                aria-label="Editor files"
              >
                {files.map((file) => (
                  <button
                    key={file.name}
                    className={`pe-fileTab ${
                      file.name === activeFile?.name ? "pe-fileTabActive" : ""
                    }`}
                    type="button"
                    role="tab"
                    aria-selected={file.name === activeFile?.name}
                    title={file.name}
                    onClick={() => setActiveFileName(file.name)}
                  >
                    {file.name}
                  </button>
                ))}
              </div>
              {controls.codeFileActionsEnabled && (
                <div className="pe-fileActions">
                  <button
                    className="pe-iconBtn"
                    type="button"
                    onClick={() => openFileModal("jsx")}
                    disabled={isAtFileLimit}
                    title="Add JavaScript or JSX file"
                    aria-label="Add JavaScript or JSX file"
                  >
                    +JS
                  </button>
                  <button
                    className="pe-iconBtn"
                    type="button"
                    onClick={() => openFileModal("css")}
                    disabled={isAtFileLimit}
                    title="Add CSS file"
                    aria-label="Add CSS file"
                  >
                    +CSS
                  </button>
                  <button
                    className="pe-iconBtn pe-iconBtnDanger"
                    type="button"
                    onClick={() => activeFile && setDeleteFileName(activeFile.name)}
                    disabled={
                      !activeFile ||
                      protectedComponentFiles.has(activeFile.name)
                    }
                    title="Delete current file"
                    aria-label="Delete current file"
                  >
                    x
                  </button>
                </div>
              )}
            </div>
          )}
          <div className="pe-editorPane" style={editorPaneStyle}>
            <CodeEditor
              value={activeFile?.content || ""}
              language={activeFile?.language || "javascript"}
              theme={theme}
              onChange={handleCodeChange}
            />
          </div>
        </div>

        {/* Resize handle */}
        <div
          className="pe-resizeHandle"
          onPointerDown={startResize}
          role="separator"
          aria-label="Resize editor"
          tabIndex={0}
        >
          ⋮
        </div>

        {/* Right panel: tests + console */}
        <div className="pe-rightPanel">
          {/* Test case panel */}
          <TestCasePanel
            challengeMode={challengeMode}
            testCases={testCases}
            runResults={runResults}
            isRunning={isRunningTests}
          />

          {/* Console panel */}
          {controls.codeConsoleEnabled && isConsoleOpen && (
            <div className="pe-consoleSection">
              <div className="pe-sectionHeader">
                <span className="pe-sectionTitle">Console</span>
                <button
                  className="pe-btnSmall"
                  type="button"
                  onClick={() => setConsoleEntries([])}
                >
                  Clear
                </button>
              </div>
              <div className="pe-consolePane">
                {consoleEntries.length === 0 ? (
                  <div className="pe-consoleEmpty">No console output</div>
                ) : (
                  consoleEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className={`pe-consoleLine pe-console-${entry.level}`}
                    >
                      <span className="pe-consoleTime">{entry.timestamp}</span>
                      <span className="pe-consoleLevel">{entry.level}</span>
                      <pre>{entry.message}</pre>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {controls.codeFileActionsEnabled && fileModalKind && (
        <div className="pe-modalOverlay">
          <form
            className="pe-modal"
            aria-labelledby="pe-create-file-title"
            onSubmit={(event) => {
              event.preventDefault();
              createFileFromModal();
            }}
            role="dialog"
            aria-modal="true"
          >
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle" id="pe-create-file-title">
                Create {fileModalKind === "css" ? "CSS" : "JavaScript"} file
              </h3>
              <button
                className="pe-iconBtn"
                type="button"
                onClick={closeFileModal}
                aria-label="Close create file dialog"
              >
                x
              </button>
            </div>
            <div className="pe-modalBody">
              <label className="pe-fieldLabel" htmlFor="pe-new-file-name">
                File name
              </label>
              <input
                id="pe-new-file-name"
                className="pe-fileInput"
                value={newFileName}
                autoFocus
                aria-invalid={Boolean(newFileError)}
                aria-describedby={
                  newFileError ? "pe-new-file-error" : "pe-new-file-hint"
                }
                onChange={(event) => {
                  setNewFileName(event.target.value);
                  setNewFileError("");
                }}
                placeholder={
                  fileModalKind === "css"
                    ? "styles.css"
                    : "components/Header.jsx"
                }
              />
              {newFileError ? (
                <p className="pe-fieldError" id="pe-new-file-error">
                  {newFileError}
                </p>
              ) : (
                <p className="pe-fieldHint" id="pe-new-file-hint">
                  Use a relative path such as components/Card.jsx.
                </p>
              )}
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={closeFileModal}>
                Cancel
              </button>
              <button
                className="pe-btn pe-btnRun"
                type="submit"
                disabled={isAtFileLimit}
              >
                Create
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Delete file confirmation modal */}
      {deleteFileName && (
        <div className="pe-modalOverlay">
          <div className="pe-modal" role="dialog" aria-modal="true">
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle">Delete File</h3>
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() => setDeleteFileName(null)}
                aria-label="Close dialog"
              >
                x
              </button>
            </div>
            <div className="pe-modalBody">
              <p>Are you sure you want to delete <strong>{deleteFileName}</strong>?</p>
              <p className="pe-fieldHint">This action cannot be undone.</p>
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={() => setDeleteFileName(null)}>
                Cancel
              </button>
              <button
                className="pe-btn pe-btnDanger"
                type="button"
                onClick={deleteActiveFile}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirmation modal */}
      {showResetConfirm && (
        <div className="pe-modalOverlay">
          <div className="pe-modal" role="dialog" aria-modal="true">
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle">Reset Code</h3>
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() => setShowResetConfirm(false)}
                aria-label="Close dialog"
              >
                x
              </button>
            </div>
            <div className="pe-modalBody">
              <p>Are you sure you want to reset all files to the starter code?</p>
              <p className="pe-fieldHint">All your changes will be lost. This action cannot be undone.</p>
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={() => setShowResetConfirm(false)}>
                Cancel
              </button>
              <button
                className="pe-btn pe-btnDanger"
                type="button"
                onClick={handleReset}
              >
                Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error banner */}
      {runResults?.error && (
        <div className="pe-errorBanner">{runResults.error}</div>
      )}
    </div>
  );
}
