import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type { EditorFile } from "@/lib/editorTypes";
import type { ChallengeMode } from "@/lib/editorTypes";
import {
  createInitialCodeFiles,
  getLanguageFromFileName,
  isValidEditorFileName,
  MAX_EDITOR_FILES,
  serializeCodeAnswer,
} from "@/lib/code-answer";

interface UseCodeFilesOptions {
  challengeMode: ChallengeMode;
  starterCode: string;
  savedCode?: string;
  questionId: string;
}

interface UseCodeFilesResult {
  files: EditorFile[];
  activeFileName: string;
  activeFile: EditorFile | undefined;
  setActiveFileName: (name: string) => void;
  updateFileContent: (fileName: string, content: string) => void;
  createFile: (fileName: string, kind: "jsx" | "css") => EditorFile | null;
  renameFile: (oldName: string, newName: string) => boolean;
  deleteFile: (fileName: string) => void;
  resetFiles: () => void;
  serialize: () => string;
}

export function useCodeFiles({
  challengeMode,
  starterCode,
  savedCode,
  questionId,
}: UseCodeFilesOptions): UseCodeFilesResult {
  const [files, setFiles] = useState<EditorFile[]>(() =>
    createInitialCodeFiles({ challengeMode, starterCode, savedCode })
  );
  const [activeFileName, setActiveFileName] = useState(
    () => files[0]?.name || "App.jsx"
  );
  const filesRef = useRef(files);
  filesRef.current = files;

  const activeFile = useMemo(
    () => files.find((file) => file.name === activeFileName) || files[0],
    [activeFileName, files]
  );

  useEffect(() => {
    const initialFiles = createInitialCodeFiles({
      challengeMode,
      starterCode,
      savedCode,
    });
    setFiles(initialFiles);
    filesRef.current = initialFiles;
    setActiveFileName(initialFiles[0]?.name || "App.jsx");
  }, [challengeMode, questionId, starterCode]);

  const updateFileContent = useCallback((fileName: string, content: string) => {
    setFiles((prev) =>
      prev.map((file) =>
        file.name === fileName ? { ...file, content } : file
      )
    );
    filesRef.current = filesRef.current.map((file) =>
      file.name === fileName ? { ...file, content } : file
    );
  }, []);

  const createFile = useCallback(
    (fileName: string, kind: "jsx" | "css"): EditorFile | null => {
      if (filesRef.current.length >= MAX_EDITOR_FILES) return null;
      if (!isValidEditorFileName(fileName)) return null;
      if (filesRef.current.some((file) => file.name === fileName)) return null;

      const newFile: EditorFile = {
        name: fileName,
        language: getLanguageFromFileName(fileName),
        content: fileName.toLowerCase().endsWith(".css")
          ? ""
          : `export default function Component() {\n  return null;\n}\n`,
      };

      setFiles((prev) => [...prev, newFile]);
      filesRef.current = [...filesRef.current, newFile];
      return newFile;
    },
    []
  );

  const renameFile = useCallback(
    (oldName: string, newName: string): boolean => {
      if (!isValidEditorFileName(newName)) return false;
      if (oldName === newName) return true;
      if (filesRef.current.some((f) => f.name === newName)) return false;

      const file = filesRef.current.find((f) => f.name === oldName);
      if (!file) return false;

      const renamed: EditorFile = {
        ...file,
        name: newName,
        language: getLanguageFromFileName(newName),
      };

      setFiles((prev) =>
        prev.map((f) => (f.name === oldName ? renamed : f))
      );
      filesRef.current = filesRef.current.map((f) =>
        f.name === oldName ? renamed : f
      );
      setActiveFileName((prev) => (prev === oldName ? newName : prev));
      return true;
    },
    []
  );

  const deleteFile = useCallback((fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    filesRef.current = filesRef.current.filter(
      (file) => file.name !== fileName
    );
    setActiveFileName((prev) => {
      if (prev === fileName) {
        return filesRef.current[0]?.name || "App.jsx";
      }
      return prev;
    });
  }, []);

  const resetFiles = useCallback(() => {
    const initialFiles = createInitialCodeFiles({
      challengeMode,
      starterCode,
      savedCode,
    });
    setFiles(initialFiles);
    filesRef.current = initialFiles;
    setActiveFileName(initialFiles[0]?.name || "App.jsx");
  }, [challengeMode, starterCode, savedCode]);

  const serialize = useCallback(
    () => serializeCodeAnswer(filesRef.current, challengeMode),
    [challengeMode]
  );

  return {
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
  };
}