"use client";

import { EditorState, StateField, type Extension } from "@codemirror/state";
import { Decoration, EditorView, type DecorationSet } from "@codemirror/view";
import dynamic from "next/dynamic";
import { useMemo, useState, useEffect, memo, type ComponentType } from "react";
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

export default memo(function CodeEditor({
  value,
  language,
  theme,
  errorLine,
  onChange,
}: CodeEditorProps) {
  const [langExtension, setLangExtension] = useState<Extension[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (language === "css") {
      import("@codemirror/lang-css").then((m) => {
        if (isMounted) setLangExtension([m.css()]);
      });
    } else {
      import("@codemirror/lang-javascript").then((m) => {
        if (isMounted) setLangExtension([m.javascript({ jsx: true })]);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [language]);

  const extensions = useMemo(() => {
    return [
      ...langExtension,
      EditorView.lineWrapping,
      errorLineExtension(errorLine),
    ];
  }, [errorLine, langExtension]);

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
});
