import * as Babel from "@babel/standalone";
import * as React from "react";
import { renderToString } from "react-dom/server.edge";
import { parseCodeFilesPayload } from "@/lib/code-answer";
import type { ChallengeMode, EditorFile } from "@/lib/editorTypes";
import type { RunCodeResult } from "@/lib/exam-scoring";

type JsonRecord = Record<string, unknown>;

type FunctionTestCase = {
  id?: string;
  name?: string;
  input?: unknown[];
  expected?: unknown;
};

type ComponentTestCase = {
  id?: string;
  name?: string;
  props?: JsonRecord;
  expectedContains?: string[];
  expectedElement?: string;
};

type TestCaseResult = {
  testCaseId: string;
  name: string;
  passed: boolean;
  actual: unknown;
  runtimeMs: number;
  error: string | null;
};

type ModuleRecord = { exports: JsonRecord };
type ModuleFactory = (
  require: (request: string) => unknown,
  moduleRecord: ModuleRecord,
  exports: JsonRecord,
  react: typeof React,
) => void;

const maxTestCases = 10;
const perTestTimeoutMs = 1500;
const functionNamePattern = /^[A-Za-z_$][\w$]{0,80}$/;
const blockedGlobalNames = [
  "Deno",
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "Worker",
  "SharedWorker",
  "importScripts",
  "localStorage",
  "sessionStorage",
  "indexedDB",
  "caches",
  "navigator",
  "document",
  "window",
  "globalThis",
  "Function",
  "eval",
];
const strictModeBlockedGlobalNames = blockedGlobalNames.filter(
  (name) => name !== "eval",
);
const strictModeBlockedGlobalValues = strictModeBlockedGlobalNames.map(
  () => undefined,
);

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : {};
}

function testName(testCase: { name?: string }, index: number) {
  return typeof testCase.name === "string" && testCase.name.trim()
    ? testCase.name
    : `Test ${index + 1}`;
}

function testId(testCase: { id?: string }, index: number) {
  return typeof testCase.id === "string" && testCase.id.trim()
    ? testCase.id
    : `tc-${index + 1}`;
}

async function withTimeout<T>(task: Promise<T>, timeoutMs: number): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeout !== undefined) clearTimeout(timeout);
  }
}

function getExportedFunction(code: string, functionName: string) {
  if (/\beval\s*\(/.test(code)) {
    throw new Error("Use of eval is not allowed");
  }

  const factory = new Function(
    ...strictModeBlockedGlobalNames,
    `"use strict";\n${code}\nreturn typeof ${functionName} !== "undefined" ? ${functionName} : typeof __defaultExport !== "undefined" ? __defaultExport : undefined;`,
  );

  return factory(...strictModeBlockedGlobalValues) as unknown;
}

function toModuleId(name: string) {
  return `./${name}`;
}

function resolveRelativeModule(request: string, fromId: string) {
  if (!request.startsWith(".")) return request;

  const baseParts = fromId.replace(/^\.\//, "").split("/");
  baseParts.pop();

  for (const part of request.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return `./${baseParts.join("/")}`;
}

function parseComponentFiles(code: string): EditorFile[] {
  return parseCodeFilesPayload(code) ?? [
    { name: "App.jsx", language: "javascript", content: code },
  ];
}

function compileComponentModule(file: EditorFile) {
  const result = Babel.transform(file.content, {
    presets: [
      ["env", { modules: "commonjs", targets: { esmodules: true } }],
      ["react", { runtime: "classic" }],
    ],
    filename: file.name,
    sourceType: "unambiguous",
  });

  return result.code || "";
}

function getComponentFromFiles(files: EditorFile[], functionName: string) {
  const cssModuleIds = new Set(
    files
      .filter((file) => file.name.endsWith(".css"))
      .map((file) => toModuleId(file.name)),
  );
  const factories = new Map<string, ModuleFactory>();
  const cache = new Map<string, ModuleRecord>();

  for (const file of files) {
    if (file.name.endsWith(".css")) continue;

    const id = toModuleId(file.name);
    const compiled = compileComponentModule(file);
    factories.set(
      id,
      new Function(
        "require",
        "module",
        "exports",
        "React",
        compiled,
      ) as ModuleFactory,
    );
  }

  function resolve(request: string, fromId: string) {
    if (request === "react") return "react";

    const relative = resolveRelativeModule(request, fromId);
    if (relative.startsWith("./")) {
      const candidates = [
        relative,
        `${relative}.js`,
        `${relative}.jsx`,
        `${relative}.css`,
      ];

      for (const candidate of candidates) {
        if (factories.has(candidate) || cssModuleIds.has(candidate)) {
          return candidate;
        }
      }
    }

    return request;
  }

  function requireFrom(request: string, fromId: string): unknown {
    const id = resolve(request, fromId);
    if (id === "react") return React;
    if (cssModuleIds.has(id)) return {};

    const factory = factories.get(id);
    if (!factory) throw new Error(`Cannot find module: ${request}`);

    const cached = cache.get(id);
    if (cached) return cached.exports;

    const moduleRecord = { exports: {} as JsonRecord };
    cache.set(id, moduleRecord);
    factory(
      (nextRequest: string) => requireFrom(nextRequest, id),
      moduleRecord,
      moduleRecord.exports,
      React,
    );

    return moduleRecord.exports;
  }

  const entryFile =
    files.find((file) => file.name === "App.jsx") ||
    files.find((file) => file.language === "javascript");

  if (!entryFile) throw new Error("No JavaScript entry file found.");

  requireFrom(toModuleId(entryFile.name), "./App.jsx");

  if (functionName !== "App") {
    for (const [, moduleRecord] of cache) {
      const exports = moduleRecord.exports;
      if (typeof exports[functionName] === "function") {
        return exports[functionName];
      }

      const defaultExport = exports.default;
      if (
        typeof defaultExport === "function" &&
        (defaultExport as { name?: string }).name === functionName
      ) {
        return defaultExport;
      }
    }
  }

  const entry = cache.get(toModuleId(entryFile.name));
  if (!entry) return null;

  return entry.exports[functionName] || entry.exports.default || entry.exports.App;
}

export function renderComponentPreviewLocally({
  files,
  functionName = "App",
}: {
  files: EditorFile[];
  functionName?: string;
}) {
  const component = getComponentFromFiles(files, functionName);

  if (typeof component !== "function") {
    throw new Error(`${functionName} is not a component function`);
  }

  return renderToString(
    React.createElement(component as React.ComponentType<JsonRecord>, {}),
  );
}

async function executeFunction(
  code: string,
  functionName: string,
  testCases: FunctionTestCase[],
) {
  const results: TestCaseResult[] = [];

  for (let index = 0; index < testCases.length; index++) {
    const tc = testCases[index];
    const start = performance.now();

    try {
      const candidate = getExportedFunction(code, functionName);
      if (typeof candidate !== "function") {
        throw new Error(`${functionName} is not a function`);
      }

      const actual = await withTimeout(
        Promise.resolve(candidate(...(Array.isArray(tc.input) ? tc.input : []))),
        perTestTimeoutMs,
      );
      const runtimeMs = Math.round(performance.now() - start);
      const passed = JSON.stringify(actual) === JSON.stringify(tc.expected);

      results.push({
        testCaseId: testId(tc, index),
        name: testName(tc, index),
        passed,
        actual,
        runtimeMs,
        error: null,
      });
    } catch (error) {
      results.push({
        testCaseId: testId(tc, index),
        name: testName(tc, index),
        passed: false,
        actual: null,
        runtimeMs: Math.round(performance.now() - start),
        error: normalizeError(error),
      });
    }
  }

  return results;
}

async function executeComponent(
  code: string,
  functionName: string,
  testCases: ComponentTestCase[],
) {
  let component: unknown;
  try {
    component = getComponentFromFiles(parseComponentFiles(code), functionName);
  } catch (error) {
    return testCases.map((tc, index) => ({
      testCaseId: testId(tc, index),
      name: testName(tc, index),
      passed: false,
      actual: null,
      runtimeMs: 0,
      error: `Compile Error: ${normalizeError(error)}`,
    }));
  }

  const results: TestCaseResult[] = [];

  for (let index = 0; index < testCases.length; index++) {
    const tc = testCases[index];
    const start = performance.now();

    try {
      if (typeof component !== "function") {
        throw new Error(`${functionName} is not a component function`);
      }

      const html = await withTimeout(
        Promise.resolve(
          renderToString(
            React.createElement(
              component as React.ComponentType<JsonRecord>,
              tc.props || {},
            ),
          ),
        ),
        perTestTimeoutMs,
      );
      const runtimeMs = Math.round(performance.now() - start);
      const htmlLower = html.toLowerCase();
      const containsAll = (tc.expectedContains || []).every((text) =>
        htmlLower.includes(text.toLowerCase()),
      );
      const hasElement =
        !tc.expectedElement ||
        htmlLower.includes(`<${tc.expectedElement.toLowerCase()}`);

      results.push({
        testCaseId: testId(tc, index),
        name: testName(tc, index),
        passed: containsAll && hasElement,
        actual: html.slice(0, 500),
        runtimeMs,
        error: null,
      });
    } catch (error) {
      results.push({
        testCaseId: testId(tc, index),
        name: testName(tc, index),
        passed: false,
        actual: null,
        runtimeMs: Math.round(performance.now() - start),
        error: normalizeError(error),
      });
    }
  }

  return results;
}

export async function executeCodeLocally({
  code,
  testCases,
  functionName,
  challengeMode,
}: {
  code: string;
  testCases: unknown[];
  functionName: string;
  challengeMode: ChallengeMode;
}): Promise<RunCodeResult> {
  const limitedTestCases = testCases.slice(0, maxTestCases);

  if (!code || limitedTestCases.length === 0 || !functionName) {
    throw new Error("Missing required fields");
  }

  if (!functionNamePattern.test(functionName)) {
    throw new Error("Invalid function name");
  }

  const results =
    challengeMode === "component"
      ? await executeComponent(
          code,
          functionName,
          limitedTestCases.map(asRecord) as ComponentTestCase[],
        )
      : await executeFunction(
          code,
          functionName,
          limitedTestCases.map(asRecord) as FunctionTestCase[],
        );
  const passed = results.filter((result) => result.passed).length;
  const failed = results.length - passed;

  return {
    success: true,
    results,
    summary: { passed, failed, total: results.length },
  };
}
