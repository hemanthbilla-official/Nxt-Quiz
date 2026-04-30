"use client";

import { css } from "@codemirror/lang-css";
import { javascript } from "@codemirror/lang-javascript";
import { EditorState, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import dynamic from "next/dynamic";
import { useMemo, type ComponentType } from "react";
import type { ReactCodeMirrorProps } from "@uiw/react-codemirror";
import type { EditorLanguage } from "@/lib/editorTypes";

type EditorTheme = "dark" | "light";

type CodeEditorProps = {
  value: string;
  language: EditorLanguage;
  theme: EditorTheme;
  errorLine?: number;
  onChange: (value: string) => void;
};

const CodeMirror = dynamic(() => import("@uiw/react-codemirror"), {
  ssr: false,
  loading: () => <div className="editorLoading">Loading editor...</div>,
}) as ComponentType<ReactCodeMirrorProps>;

function buildErrorDecorations(state: EditorState, line?: number) {
  if (!line || line < 1 || line > state.doc.lines) {
    return Decoration.set([]);
  }

  const lineInfo = state.doc.line(line);

  return Decoration.set([
    Decoration.line({
      class: "cm-errorLine",
    }).range(lineInfo.from),
  ]);
}

function errorLineExtension(line?: number): Extension {
  return StateField.define<DecorationSet>({
    create(state) {
      return buildErrorDecorations(state, line);
    },
    update(decorations, transaction) {
      if (transaction.docChanged) {
        return buildErrorDecorations(transaction.state, line);
      }

      return decorations;
    },
    provide(field) {
      return EditorView.decorations.from(field);
    },
  });
}

export default function CodeEditor({
  value,
  language,
  theme,
  errorLine,
  onChange,
}: CodeEditorProps) {
  const extensions = useMemo(() => {
    const languageExtension =
      language === "css" ? css() : javascript({ jsx: true });

    return [languageExtension, errorLineExtension(errorLine)];
  }, [errorLine, language]);

  return (
    <CodeMirror
      value={value}
      height="100%"
      theme={theme}
      extensions={extensions}
      basicSetup={{
        autocompletion: true,
        bracketMatching: true,
        foldGutter: true,
        highlightActiveLine: true,
        lineNumbers: true,
      }}
      onChange={onChange}
    />
  );
}
