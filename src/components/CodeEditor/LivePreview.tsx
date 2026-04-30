"use client";

import { useEffect, useMemo, useRef } from "react";
import * as Babel from "@babel/standalone";
import type {
  ConsoleEntry,
  ConsoleLevel,
  EditorFile,
  PreviewStatusPayload,
} from "@/lib/editorTypes";

const reactVersion = "19.2.4";
const reactRouterDomVersion = "7.14.2";
const messageSource = "react-code-editor-preview";
const maxPreviewSourceBytes = 250_000;
const maxConsoleMessageLength = 20_000;

type LivePreviewProps = {
  files: EditorFile[];
  onConsoleMessage: (entry: ConsoleEntry) => void;
  onStatusChange: (payload: PreviewStatusPayload) => void;
};

type CompileResult = {
  srcDoc: string;
  payload: PreviewStatusPayload;
};

type PreviewMessage = {
  source?: string;
  type?: "console" | "runtime-error";
  level?: ConsoleLevel;
  message?: string;
};

function escapeScript(code: string) {
  return code.replace(/<\/script/gi, "<\\/script");
}

function escapeStyle(cssText: string) {
  return cssText.replace(/<\/style/gi, "<\\/style");
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[char] ?? char
  );
}

function toModuleId(name: string) {
  return `./${name}`;
}

function createBlankDocument() {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        background: #f7f8fb;
        color: #697586;
        font: 14px Inter, system-ui, sans-serif;
      }
    </style>
  </head>
  <body>Output cleared. Press Run to render again.</body>
</html>`;
}

function createErrorDocument(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body {
        margin: 0;
        padding: 18px;
        background: #fff5f5;
        color: #842029;
        font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        white-space: pre-wrap;
      }
    </style>
  </head>
  <body>${escapeHtml(message)}</body>
</html>`;
}

function compileJavaScript(file: EditorFile) {
  const result = Babel.transform(file.content, {
    filename: file.name,
    presets: [
      ["env", { modules: "commonjs", targets: { esmodules: true } }],
      ["react", { runtime: "classic" }],
    ],
    sourceType: "unambiguous",
  });

  return result.code ?? "";
}

function createModuleDefinitions(files: EditorFile[]) {
  return files
    .filter((file) => file.language === "javascript")
    .map((file) => {
      const compiled = compileJavaScript(file);

      return `__define(${JSON.stringify(toModuleId(file.name))}, function(require, module, exports) {
${escapeScript(compiled)}
});`;
    })
    .join("\n\n");
}

function createPreviewDocument(files: EditorFile[]) {
  const cssFiles = files.filter((file) => file.language === "css");
  const entryFile =
    files.find((file) => file.name === "App.jsx") ??
    files.find((file) => file.language === "javascript");
  const cssText = cssFiles
    .map((file) => `/* ${file.name} */\n${file.content}`)
    .join("\n\n");
  const moduleDefinitions = createModuleDefinitions(files);
  const cssModuleIds = cssFiles.map((file) => toModuleId(file.name));
  const entryId = entryFile ? toModuleId(entryFile.name) : "";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; script-src 'unsafe-inline' https://esm.sh; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; connect-src 'none'; form-action 'none'; base-uri 'none'; object-src 'none'"
    />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      html,
      body,
      #mountNode {
        min-height: 100%;
        margin: 0;
      }

      body {
        background: white;
      }

      .runtime-error {
        margin: 0;
        padding: 18px;
        color: #842029;
        background: #fff5f5;
        font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
        white-space: pre-wrap;
      }
    </style>
    <style>${escapeStyle(cssText)}</style>
  </head>
  <body>
    <div id="mountNode"></div>
    <script type="module">
      import React from "https://esm.sh/react@${reactVersion}/?dev";
      import * as ReactDOMClient from "https://esm.sh/react-dom@${reactVersion}/client?deps=react@${reactVersion}&dev";
      import * as ReactRouterDOM from "https://esm.sh/react-router-dom@${reactRouterDomVersion}?deps=react@${reactVersion},react-dom@${reactVersion}&dev";

      const mountNode = document.getElementById("mountNode");
      const ReactDOM = ReactDOMClient;
      const __RouterDOM = {
        ...ReactRouterDOM,
        BrowserRouter: ReactRouterDOM.MemoryRouter,
        HashRouter: ReactRouterDOM.MemoryRouter
      };
      const __localStorageData = Object.create(null);
      const __NativeURL = window.URL;
      const __cssModules = new Set(${JSON.stringify(cssModuleIds)});
      const __factories = Object.create(null);
      const __cache = Object.create(null);
      const __nativeConsole = {
        log: console.log.bind(console),
        info: console.info.bind(console),
        warn: console.warn.bind(console),
        error: console.error.bind(console)
      };

      function __serialize(value) {
        if (value instanceof Error) {
          return value.stack || value.message;
        }

        if (typeof value === "string") {
          return value;
        }

        try {
          return JSON.stringify(value, null, 2);
        } catch {
          return String(value);
        }
      }

      function __postConsole(level, values) {
        window.parent.postMessage({
          source: "${messageSource}",
          type: "console",
          level,
          message: values.map(__serialize).join(" ")
        }, "*");
      }

      ["log", "info", "warn", "error"].forEach((level) => {
        console[level] = (...values) => {
          __nativeConsole[level](...values);
          __postConsole(level, values);
        };
      });

      class __PreviewURL extends __NativeURL {
        constructor(url, base) {
          const normalizedBase =
            !base || base === "null" || base === "about:srcdoc"
              ? "https://preview.local/"
              : base;

          super(url, normalizedBase);
        }
      }

      __PreviewURL.canParse = __NativeURL.canParse?.bind(__NativeURL);
      __PreviewURL.createObjectURL = __NativeURL.createObjectURL?.bind(__NativeURL);
      __PreviewURL.parse = __NativeURL.parse?.bind(__NativeURL);
      __PreviewURL.revokeObjectURL = __NativeURL.revokeObjectURL?.bind(__NativeURL);
      window.URL = __PreviewURL;

      const __nativePushState = window.history.pushState.bind(window.history);
      const __nativeReplaceState = window.history.replaceState.bind(window.history);

      function __toSandboxHash(url) {
        if (url === undefined || url === null || url === "") {
          return "";
        }

        const value = String(url);

        if (value.startsWith("#")) {
          return value;
        }

        try {
          const parsed = new __NativeURL(value, "https://preview.local/");
          return parsed.hash || "#/";
        } catch {
          return value.includes("#") ? value.slice(value.indexOf("#")) : "#/";
        }
      }

      window.history.pushState = function pushState(state, title, url) {
        const sandboxUrl = __toSandboxHash(url);
        return sandboxUrl
          ? __nativePushState(state, title, sandboxUrl)
          : __nativePushState(state, title);
      };

      window.history.replaceState = function replaceState(state, title, url) {
        const sandboxUrl = __toSandboxHash(url);
        return sandboxUrl
          ? __nativeReplaceState(state, title, sandboxUrl)
          : __nativeReplaceState(state, title);
      };

      document.addEventListener("click", (event) => {
        const link = event.target instanceof Element ? event.target.closest("a[href]") : null;

        if (!link) {
          return;
        }

        const href = link.getAttribute("href");

        if (!href || !href.includes("#/")) {
          return;
        }

        event.preventDefault();
        window.history.pushState(null, "", __toSandboxHash(href));
        window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
      });

      Object.defineProperty(window, "localStorage", {
        configurable: true,
        value: {
          get length() {
            return Object.keys(__localStorageData).length;
          },
          key(index) {
            return Object.keys(__localStorageData)[index] ?? null;
          },
          getItem(key) {
            const normalizedKey = String(key);
            return Object.prototype.hasOwnProperty.call(__localStorageData, normalizedKey)
              ? __localStorageData[normalizedKey]
              : null;
          },
          setItem(key, value) {
            __localStorageData[String(key)] = String(value);
          },
          removeItem(key) {
            delete __localStorageData[String(key)];
          },
          clear() {
            Object.keys(__localStorageData).forEach((key) => {
              delete __localStorageData[key];
            });
          }
        }
      });

      function showRuntimeError(error) {
        const message = error && error.stack ? error.stack : String(error);
        mountNode.innerHTML = "";
        const element = document.createElement("pre");
        element.className = "runtime-error";
        element.textContent = message;
        mountNode.appendChild(element);
        window.parent.postMessage({
          source: "${messageSource}",
          type: "runtime-error",
          level: "error",
          message
        }, "*");
      }

      window.addEventListener("error", (event) => {
        showRuntimeError(event.error || event.message);
      });

      window.addEventListener("unhandledrejection", (event) => {
        showRuntimeError(event.reason);
      });

      function __define(id, factory) {
        __factories[id] = factory;
      }

      function __normalizeRelativeModule(request, fromId) {
        if (!request.startsWith(".")) {
          return request;
        }

        const baseParts = String(fromId || "./App.jsx").replace(/^\.\//, "").split("/");
        baseParts.pop();

        for (const part of request.split("/")) {
          if (!part || part === ".") {
            continue;
          }
          if (part === "..") {
            baseParts.pop();
          } else {
            baseParts.push(part);
          }
        }

        return "./" + baseParts.join("/");
      }

      function __resolve(request, fromId) {
        if (request === "react") {
          return "react";
        }

        if (request === "react-dom" || request === "react-dom/client") {
          return "react-dom/client";
        }

        if (request === "react-router-dom") {
          return "react-router-dom";
        }

        const relativeRequest = __normalizeRelativeModule(request, fromId);

        if (relativeRequest.startsWith("./")) {
          const candidates = [
            relativeRequest,
            relativeRequest + ".js",
            relativeRequest + ".jsx",
            relativeRequest + ".css"
          ];

          for (const candidate of candidates) {
            if (__factories[candidate] || __cssModules.has(candidate)) {
              return candidate;
            }
          }
        }

        return request;
      }

      function require(request, fromId = "./App.jsx") {
        const id = __resolve(request, fromId);

        if (id === "react") {
          return React;
        }

        if (id === "react-dom/client") {
          return ReactDOMClient;
        }

        if (id === "react-router-dom") {
          return __RouterDOM;
        }

        if (__cssModules.has(id)) {
          return {};
        }

        if (!__factories[id]) {
          throw new Error("Cannot find module: " + request);
        }

        if (__cache[id]) {
          return __cache[id].exports;
        }

        const module = { exports: {} };
        __cache[id] = module;
        __factories[id]((nextRequest) => require(nextRequest, id), module, module.exports);

        return module.exports;
      }

      try {
        ${moduleDefinitions}

        if (${JSON.stringify(Boolean(entryId))}) {
          const entry = require(${JSON.stringify(entryId)});
          const Component = entry.default || entry.App;

          if (!Component) {
            throw new Error("App.jsx must export a default React component.");
          }

          if (mountNode.childNodes.length === 0) {
            ReactDOMClient.createRoot(mountNode).render(React.createElement(Component));
          }
        }
      } catch (error) {
        showRuntimeError(error);
      }
    </script>
  </body>
</html>`;
}

function getErrorPayload(error: unknown): PreviewStatusPayload {
  const maybeBabelError = error as {
    message?: string;
    loc?: { line?: number; column?: number };
    filename?: string;
  };

  return {
    status: "error",
    error: {
      fileName: maybeBabelError.filename,
      line: maybeBabelError.loc?.line,
      column: maybeBabelError.loc?.column,
      message: maybeBabelError.message ?? String(error),
    },
  };
}

function compilePreview(files: EditorFile[]): CompileResult {
  if (files.length === 0) {
    return {
      srcDoc: createBlankDocument(),
      payload: { status: "cleared" },
    };
  }

  try {
    const sourceBytes = files.reduce(
      (totalBytes, file) => totalBytes + new Blob([file.content]).size,
      0
    );

    if (sourceBytes > maxPreviewSourceBytes) {
      throw new Error(
        "Preview source is too large to compile in the browser."
      );
    }

    return {
      srcDoc: createPreviewDocument(files),
      payload: { status: "ready" },
    };
  } catch (error) {
    return {
      srcDoc: createErrorDocument(error),
      payload: getErrorPayload(error),
    };
  }
}

export default function LivePreview({
  files,
  onConsoleMessage,
  onStatusChange,
}: LivePreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const preview = useMemo(() => compilePreview(files), [files]);

  useEffect(() => {
    onStatusChange(preview.payload);
  }, [onStatusChange, preview.payload]);

  useEffect(() => {
    function handleMessage(event: MessageEvent<PreviewMessage>) {
      if (
        event.source !== iframeRef.current?.contentWindow ||
        event.origin !== "null"
      ) {
        return;
      }

      if (
        event.data?.source !== messageSource ||
        typeof event.data.message !== "string"
      ) {
        return;
      }

      const level = event.data.level ?? "log";
      const safeLevel: ConsoleLevel = ["log", "info", "warn", "error"].includes(
        level
      )
        ? level
        : "log";
      const safeMessage = event.data.message.slice(
        0,
        maxConsoleMessageLength
      );

      onConsoleMessage({
        id: crypto.randomUUID(),
        level: safeLevel,
        message: safeMessage,
        timestamp: new Date().toLocaleTimeString(),
      });

      if (event.data.type === "runtime-error") {
        onStatusChange({
          status: "error",
          error: {
            message: safeMessage,
          },
        });
      }
    }

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [onConsoleMessage, onStatusChange]);

  return (
    <iframe
      ref={iframeRef}
      className="previewFrame"
      title="Live code preview"
      sandbox="allow-scripts"
      referrerPolicy="no-referrer"
      srcDoc={preview.srcDoc}
    />
  );
}
