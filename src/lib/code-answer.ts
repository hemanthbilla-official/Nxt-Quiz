import type { ChallengeMode, EditorFile, EditorLanguage } from "./editorTypes";

export const CODE_FILES_PAYLOAD_KIND = "nxt-quiz/code-files";
export const MAX_EDITOR_FILES = 8;

type CodeFilesPayload = {
  kind: typeof CODE_FILES_PAYLOAD_KIND;
  version: 1;
  files: EditorFile[];
};

const validFileNamePattern =
  /^(?!.*(?:^|\/)\.\.(?:\/|$))(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:js|jsx|css)$/;

export function getDefaultFileName(challengeMode: ChallengeMode) {
  return challengeMode === "component" ? "App.jsx" : "solution.js";
}

export function getLanguageFromFileName(fileName: string): EditorLanguage {
  return fileName.toLowerCase().endsWith(".css") ? "css" : "javascript";
}

export function isValidEditorFileName(fileName: string) {
  return validFileNamePattern.test(fileName.trim());
}

function asEditorFile(value: unknown): EditorFile | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  const file = value as Record<string, unknown>;
  const name = typeof file.name === "string" ? file.name.trim() : "";
  const content = typeof file.content === "string" ? file.content : "";

  if (!isValidEditorFileName(name)) {
    return null;
  }

  const language =
    file.language === "css" || file.language === "javascript"
      ? file.language
      : getLanguageFromFileName(name);

  return { name, language, content };
}

export function normalizeEditorFiles(
  files: unknown,
  fallbackFiles: EditorFile[],
): EditorFile[] {
  if (!Array.isArray(files)) {
    return fallbackFiles;
  }

  const seen = new Set<string>();
  const normalized: EditorFile[] = [];

  for (const file of files) {
    const editorFile = asEditorFile(file);
    if (!editorFile || seen.has(editorFile.name)) {
      continue;
    }

    seen.add(editorFile.name);
    normalized.push(editorFile);

    if (normalized.length >= MAX_EDITOR_FILES) {
      break;
    }
  }

  return normalized.length > 0 ? normalized : fallbackFiles;
}

export function serializeCodeFiles(files: EditorFile[]) {
  const payload: CodeFilesPayload = {
    kind: CODE_FILES_PAYLOAD_KIND,
    version: 1,
    files: normalizeEditorFiles(files, []),
  };

  return JSON.stringify(payload);
}

export function parseCodeFilesPayload(value?: string | null) {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<CodeFilesPayload>;
    if (parsed.kind !== CODE_FILES_PAYLOAD_KIND || parsed.version !== 1) {
      return null;
    }

    return normalizeEditorFiles(parsed.files, []);
  } catch {
    return null;
  }
}

export function createInitialCodeFiles({
  challengeMode,
  starterCode,
  savedCode,
}: {
  challengeMode: ChallengeMode;
  starterCode: string;
  savedCode?: string | null;
}) {
  const defaultFileName = getDefaultFileName(challengeMode);
  const starterFiles = parseCodeFilesPayload(starterCode);
  const savedFiles = parseCodeFilesPayload(savedCode);

  if (savedFiles?.length) return savedFiles;
  if (starterFiles?.length) return starterFiles;

  return [
    {
      name: defaultFileName,
      language: getLanguageFromFileName(defaultFileName),
      content: savedCode || starterCode || "",
    },
  ];
}

export function serializeCodeAnswer(
  files: EditorFile[],
  challengeMode: ChallengeMode,
) {
  if (challengeMode === "component") {
    return serializeCodeFiles(files);
  }

  return files[0]?.content || "";
}
