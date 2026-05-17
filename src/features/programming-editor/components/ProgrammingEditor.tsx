"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import CodeEditor from "@/components/CodeEditor/CodeEditor";
import TestCasePanel from "@/components/CodeEditor/TestCasePanel";
import { DEFAULT_EXAM_CONTROLS, type ExamControls } from "@/lib/exam-controls";
import type { ChallengeMode, EditorFile, RunCodeResponse, TestCase } from "@/lib/editorTypes";

import {
  useCodeFiles,
  useAutosave,
  useCodeExecution,
  useCodeFormatting,
  useCodeHistory,
} from "../hooks";

type ProgrammingEditorProps = {
  questionId: string;
  challengeMode: ChallengeMode;
  starterCode: string;
  testCases: TestCase[];
  savedCode?: string;
  onCodeChange: (code: string) => void;
  examId: string;
  controls?: ExamControls;
  theme?: "dark" | "light";
  className?: string;
};

const defaultEditorFontSize = 15;
const minEditorFontSize = 11;
const maxEditorFontSize = 20;

export function ProgrammingEditor({
  questionId,
  challengeMode,
  starterCode,
  testCases,
  savedCode,
  onCodeChange,
  examId,
  controls = DEFAULT_EXAM_CONTROLS,
  theme = "dark",
  className = "",
}: ProgrammingEditorProps) {
  const [editorPercent] = useState(55);
  const [editorFontSize, setEditorFontSize] = useState(defaultEditorFontSize);
  const [fileModalKind, setFileModalKind] = useState<"jsx" | "css" | null>(null);
  const [newFileName, setNewFileName] = useState("");
  const [newFileError, setNewFileError] = useState("");
  const [deleteFileName, setDeleteFileName] = useState<string | null>(null);
  const [renameTarget, setRenameTarget] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [renameError, setRenameError] = useState("");
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTestPanelOpen, setIsTestPanelOpen] = useState(false);

  const {
    files,
    activeFileName,
    activeFile,
    setActiveFileName,
    updateFileContent,
    createFile,
    renameFile,
    deleteFile,
    resetFiles,
    serialize,
  } = useCodeFiles({
    challengeMode,
    starterCode,
    savedCode,
    questionId,
  });

  const { save: autoSave } = useAutosave({
    onSave: (code) => onCodeChange(code),
    delay: 10000,
  });

  const { runResults, isRunning, cooldown, runTests } = useCodeExecution({
    examId,
    questionId,
    testCaseCount: testCases.length,
    enabled: controls.codeRunTestsEnabled,
  });

  const { formatCode } = useCodeFormatting({
    enabled: controls.codeFormatEnabled,
  });

  const { pushHistory, undo, canUndo } = useCodeHistory();

  const serializeRef = useRef(serialize);
  const autoSaveRef = useRef(autoSave);

  useEffect(() => {
    serializeRef.current = serialize;
    autoSaveRef.current = autoSave;
  }, [serialize, autoSave]);

  useEffect(() => {
    return () => {
      // Force an immediate save on unmount if there's pending changes.
      // The debounce in useAutosave Answers handles the network side.
      autoSaveRef.current(serializeRef.current(), true);
    };
  }, []);

  const emitCodeChange = useCallback(
    (nextFiles: EditorFile[], immediate = false) => {
      const serialized = serialize();
      autoSave(serialized, immediate);
    },
    [serialize, autoSave]
  );

  const handleCodeChange = useCallback(
    (newCode: string) => {
      if (!activeFileName) return;
      pushHistory(files);
      updateFileContent(activeFileName, newCode);
      emitCodeChange(files);
    },
    [activeFileName, files, pushHistory, updateFileContent, emitCodeChange]
  );

  const handleUndo = useCallback(() => {
    const previous = undo();
    if (previous) {
      emitCodeChange(previous, true);
    }
  }, [undo, emitCodeChange]);

  const handleReset = useCallback(() => {
    pushHistory(files);
    resetFiles();
    emitCodeChange(files, true);
    setShowResetConfirm(false);
  }, [files, pushHistory, resetFiles, emitCodeChange]);

  const handleFormat = useCallback(async () => {
    if (!activeFile || !controls.codeFormatEnabled) return;
    const formatted = await formatCode(activeFile.content, activeFile.language);
    updateFileContent(activeFile.name, formatted);
    emitCodeChange(files, true);
  }, [activeFile, controls.codeFormatEnabled, formatCode, updateFileContent, emitCodeChange, files]);

  const handleRunTests = useCallback(() => {
    const serialized = serialize();
    runTests(serialized);
  }, [serialize, runTests]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (controls.codeFormatEnabled) {
          void handleFormat();
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [controls.codeFormatEnabled, handleFormat]);

  useEffect(() => {
    if (!controls.codeFileActionsEnabled) {
      setFileModalKind(null);
    }
  }, [controls.codeFileActionsEnabled]);

  const openFileModal = useCallback((kind: "jsx" | "css") => {
    setFileModalKind(kind);
    setNewFileName(kind === "css" ? `styles${files.length}.css` : `components/Component${files.length}.jsx`);
    setNewFileError(files.length >= 20 ? "You can create up to 20 files." : "");
  }, [files.length]);

  const closeFileModal = useCallback(() => {
    setFileModalKind(null);
    setNewFileName("");
    setNewFileError("");
  }, []);

  const handleCreateFile = useCallback(() => {
    if (!fileModalKind) return;
    const fileName = newFileName.trim();
    
    if (files.length >= 20) {
      setNewFileError("You can create up to 20 files.");
      return;
    }
    if (!fileName) {
      setNewFileError("Enter a file name.");
      return;
    }
    if (fileName.endsWith(".css") && fileModalKind !== "css") {
      setNewFileError("CSS files must end in .css.");
      return;
    }
    if (!fileName.endsWith(".css") && fileModalKind === "css") {
      setNewFileError("JavaScript files must end in .js or .jsx.");
      return;
    }

    const newFile = createFile(fileName, fileModalKind);
    if (newFile) {
      setActiveFileName(fileName);
      emitCodeChange([...files, newFile], true);
      closeFileModal();
    }
  }, [fileModalKind, newFileName, files, createFile, setActiveFileName, emitCodeChange, closeFileModal]);

  const handleDeleteFile = useCallback(() => {
    if (!deleteFileName) return;
    deleteFile(deleteFileName);
    emitCodeChange(files.filter(f => f.name !== deleteFileName), true);
    setDeleteFileName(null);
  }, [deleteFileName, deleteFile, files, emitCodeChange]);

  const openRenameModal = useCallback((fileName: string) => {
    setRenameTarget(fileName);
    setRenameValue(fileName);
    setRenameError("");
  }, []);

  const closeRenameModal = useCallback(() => {
    setRenameTarget(null);
    setRenameValue("");
    setRenameError("");
  }, []);

  const handleRenameFile = useCallback(() => {
    if (!renameTarget) return;
    const newName = renameValue.trim();
    if (!newName) {
      setRenameError("Enter a file name.");
      return;
    }
    if (!renameFile(renameTarget, newName)) {
      setRenameError("Invalid name or file already exists.");
      return;
    }
    emitCodeChange(
      files.map((f) => (f.name === renameTarget ? { ...f, name: newName } : f)),
      true
    );
    closeRenameModal();
  }, [renameTarget, renameValue, renameFile, files, emitCodeChange, closeRenameModal]);

  const statusText = useMemo(() => {
    if (isRunning) return "Running tests...";
    if (runResults) {
      const { passed, total } = runResults.summary;
      return `${passed}/${total} tests passing`;
    }
    return "Ready";
  }, [isRunning, runResults]);

  const statusClass = useMemo(() => {
    if (runResults?.summary.failed === 0 && runResults.summary.passed > 0)
      return "pe-statusPass";
    if (runResults?.summary.failed) return "pe-statusFail";
    return "pe-statusReady";
  }, [runResults]);

  const workspaceStyle = {
    "--pe-editor-width": "100%",
    gridTemplateColumns: "1fr",
  } as CSSProperties;
  const editorPaneStyle = {
    "--pe-code-font-size": `${editorFontSize}px`,
  } as CSSProperties;

  const isComponentMode = challengeMode === "component";
  const isAtFileLimit = files.length >= 20;

  return (
    <div className={`programming-editor ${isFullscreen ? "pe-fullscreen" : ""} ${className}`} data-theme={theme}>
      <div className="pe-toolbar">
        <div className="pe-toolbarLeft">
          <span className={`pe-status ${statusClass}`}>{statusText}</span>
        </div>
        <div className="pe-toolbarRight">
          {controls.codeRunTestsEnabled && (
            <button
              className="pe-btn pe-btnTest"
              type="button"
              onClick={handleRunTests}
              disabled={isRunning || cooldown > 0}
              title="Run test cases"
            >
              {isRunning ? "Running..." : cooldown > 0 ? `Wait ${cooldown}s` : "▶ Run Tests"}
            </button>
          )}
          {controls.codeFormatEnabled && (
            <button className="pe-btn" type="button" onClick={handleFormat} title="Format code (Ctrl+S)">
              Format
            </button>
          )}
          <button className="pe-btn" type="button" onClick={handleUndo} disabled={!canUndo} title="Undo last change">
            Undo
          </button>
          <button className="pe-btn" type="button" onClick={() => setShowResetConfirm(true)} title="Reset to starter code">
            Reset
          </button>
          {controls.codeZoomEnabled && (
            <div className="pe-codeZoom" aria-label="Code zoom controls">
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() => setEditorFontSize((size) => Math.max(minEditorFontSize, size - 1))}
                disabled={editorFontSize <= minEditorFontSize}
                title="Zoom code out"
                aria-label="Zoom code out"
              >
                -
              </button>
              <span className="pe-zoomValue" aria-label="Code font size">{editorFontSize}px</span>
              <button
                className="pe-iconBtn"
                type="button"
                onClick={() => setEditorFontSize((size) => Math.min(maxEditorFontSize, size + 1))}
                disabled={editorFontSize >= maxEditorFontSize}
                title="Zoom code in"
                aria-label="Zoom code in"
              >
                +
              </button>
            </div>
          )}
          <button className="pe-btn pe-btnSmall" type="button" onClick={() => setIsFullscreen((v) => !v)}>
            {isFullscreen ? "Exit" : "Fullscreen"}
          </button>
        </div>
      </div>

      <div ref={useRef<HTMLDivElement>(null)} className="pe-workspace" style={workspaceStyle}>
        <div className="pe-editorPanel">
          {isComponentMode && (
            <div className="pe-fileBar">
              <div className="pe-fileTabs" role="tablist" aria-label="Editor files">
                {files.map((file) => (
                  <div key={file.name} className="pe-fileTabWrapper">
                    <button
                      className={`pe-fileTab ${file.name === activeFile?.name ? "pe-fileTabActive" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={file.name === activeFile?.name}
                      title={file.name}
                      onClick={() => setActiveFileName(file.name)}
                    >
                      {file.name}
                    </button>
                    <button
                      className="pe-fileTabRename"
                      type="button"
                      title="Rename file"
                      onClick={(e) => { e.stopPropagation(); openRenameModal(file.name); }}
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      </svg>
                    </button>
                  </div>
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
                  >
                    +JS
                  </button>
                  <button
                    className="pe-iconBtn"
                    type="button"
                    onClick={() => openFileModal("css")}
                    disabled={isAtFileLimit}
                    title="Add CSS file"
                  >
                    +CSS
                  </button>
                  <button
                    className="pe-iconBtn pe-iconBtnDanger"
                    type="button"
                    onClick={() => activeFile && setDeleteFileName(activeFile.name)}
                    disabled={!activeFile || activeFile.name === "App.jsx"}
                    title="Delete current file"
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
          <div className="pe-editorBottomDock">
            <TestCasePanel
              challengeMode={challengeMode}
              testCases={testCases}
              runResults={runResults}
              isRunning={isRunning}
              isCollapsed={!isTestPanelOpen}
              onToggle={() => setIsTestPanelOpen(!isTestPanelOpen)}
            />
          </div>
        </div>
      </div>

      {fileModalKind && (
        <div className="pe-modalOverlay">
          <form
            className="pe-modal"
            aria-labelledby="pe-create-file-title"
            onSubmit={(e) => { e.preventDefault(); handleCreateFile(); }}
            role="dialog"
            aria-modal="true"
          >
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle" id="pe-create-file-title">
                Create {fileModalKind === "css" ? "CSS" : "JavaScript"} file
              </h3>
              <button className="pe-iconBtn" type="button" onClick={closeFileModal} aria-label="Close">x</button>
            </div>
            <div className="pe-modalBody">
              <label className="pe-fieldLabel" htmlFor="pe-new-file-name">File name</label>
              <input
                id="pe-new-file-name"
                className="pe-fileInput"
                value={newFileName}
                autoFocus
                aria-invalid={Boolean(newFileError)}
                onChange={(e) => { setNewFileName(e.target.value); setNewFileError(""); }}
                placeholder={fileModalKind === "css" ? "styles.css" : "components/Header.jsx"}
              />
              {newFileError ? (
                <p className="pe-fieldError">{newFileError}</p>
              ) : (
                <p className="pe-fieldHint">Use a relative path such as components/Card.jsx.</p>
              )}
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={closeFileModal}>Cancel</button>
              <button className="pe-btn pe-btnRun" type="submit" disabled={isAtFileLimit}>Create</button>
            </div>
          </form>
        </div>
      )}

      {deleteFileName && (
        <div className="pe-modalOverlay">
          <div className="pe-modal" role="dialog" aria-modal="true">
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle">Delete File</h3>
              <button className="pe-iconBtn" type="button" onClick={() => setDeleteFileName(null)}>x</button>
            </div>
            <div className="pe-modalBody">
              <p>Are you sure you want to delete <strong>{deleteFileName}</strong>?</p>
              <p className="pe-fieldHint">This action cannot be undone.</p>
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={() => setDeleteFileName(null)}>Cancel</button>
              <button className="pe-btn pe-btnDanger" type="button" onClick={handleDeleteFile}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {renameTarget && (
        <div className="pe-modalOverlay">
          <form
            className="pe-modal"
            aria-labelledby="pe-rename-file-title"
            onSubmit={(e) => { e.preventDefault(); handleRenameFile(); }}
            role="dialog"
            aria-modal="true"
          >
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle" id="pe-rename-file-title">Rename File</h3>
              <button className="pe-iconBtn" type="button" onClick={closeRenameModal} aria-label="Close">x</button>
            </div>
            <div className="pe-modalBody">
              <label className="pe-fieldLabel" htmlFor="pe-rename-file-name">New file name</label>
              <input
                id="pe-rename-file-name"
                className="pe-fileInput"
                value={renameValue}
                autoFocus
                aria-invalid={Boolean(renameError)}
                onChange={(e) => { setRenameValue(e.target.value); setRenameError(""); }}
                placeholder="Enter new file name"
              />
              {renameError ? (
                <p className="pe-fieldError">{renameError}</p>
              ) : (
                <p className="pe-fieldHint">Use a relative path such as components/Card.jsx.</p>
              )}
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={closeRenameModal}>Cancel</button>
              <button className="pe-btn pe-btnRun" type="submit">Rename</button>
            </div>
          </form>
        </div>
      )}

      {showResetConfirm && (
        <div className="pe-modalOverlay">
          <div className="pe-modal" role="dialog" aria-modal="true">
            <div className="pe-modalHeader">
              <h3 className="pe-modalTitle">Reset Code</h3>
              <button className="pe-iconBtn" type="button" onClick={() => setShowResetConfirm(false)}>x</button>
            </div>
            <div className="pe-modalBody">
              <p>Are you sure you want to reset all files to the starter code?</p>
              <p className="pe-fieldHint">All your changes will be lost. This action cannot be undone.</p>
            </div>
            <div className="pe-modalActions">
              <button className="pe-btn" type="button" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="pe-btn pe-btnDanger" type="button" onClick={handleReset}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {runResults?.error && <div className="pe-errorBanner">{runResults.error}</div>}
    </div>
  );
}