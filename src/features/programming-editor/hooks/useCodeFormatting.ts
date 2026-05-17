import { useCallback, useRef } from "react";
import * as prettier from "prettier/standalone";
import babelPlugin from "prettier/plugins/babel";
import estreePlugin from "prettier/plugins/estree";
import postcssPlugin from "prettier/plugins/postcss";

interface UseCodeFormattingOptions {
  enabled: boolean;
}

export function useCodeFormatting({ enabled }: UseCodeFormattingOptions) {
  const formattingRef = useRef(false);

  const formatCode = useCallback(
    async (content: string, language: string): Promise<string> => {
      if (!enabled || formattingRef.current) return content;
      formattingRef.current = true;

      try {
        const formatted = await prettier.format(content, {
          parser: language === "css" ? "css" : "babel",
          plugins: [babelPlugin, estreePlugin, postcssPlugin],
          semi: true,
          trailingComma: "none",
        });
        return formatted.trimEnd();
      } catch {
        return content;
      } finally {
        formattingRef.current = false;
      }
    },
    [enabled]
  );

  return { formatCode };
}