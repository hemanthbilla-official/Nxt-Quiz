// @ts-nocheck
// Supabase Edge Function: run-code
// Executes JavaScript/React challenge submissions against server-held tests.
// NOTE: This file runs in the Deno-based Supabase Edge Runtime, NOT Node.js.
// IDE errors about Deno APIs, URL imports, etc. are expected and harmless.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

declare const Deno: {
  env: {
    get(name: string): string | undefined;
  };
};

type ReactRuntime = {
  createElement(component: unknown, props: Record<string, unknown>): unknown;
};

type RenderToString = (element: unknown) => string;

type BabelRuntime = {
  transform(
    source: string,
    options: Record<string, unknown>,
  ): { code?: string };
};

let React: ReactRuntime | null = null;
let renderToString: RenderToString | null = null;
let babelTransform: BabelRuntime["transform"] | null = null;

const maxCodeBytes = 200_000;
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

async function loadReactDeps() {
  if (React && renderToString && babelTransform) return;

  const reactModule = (await import("https://esm.sh/react@19.2.4")) as {
    default: ReactRuntime;
  };
  const serverModule = (await import(
    "https://esm.sh/react-dom@19.2.4/server"
  )) as { renderToString: RenderToString };
  const babelModule = (await import(
    "https://esm.sh/@babel/standalone@7.29.2"
  )) as BabelRuntime;

  React = reactModule.default;
  renderToString = serverModule.renderToString;
  babelTransform = babelModule.transform;
}

interface FunctionTestCase {
  id?: string;
  name?: string;
  input?: unknown[];
  expected?: unknown;
}

interface ComponentTestCase {
  id?: string;
  name?: string;
  props?: Record<string, unknown>;
  expectedContains?: string[];
  expectedElement?: string;
}

interface SubmissionFile {
  name: string;
  language?: "javascript" | "css";
  content: string;
}

type ModuleRecord = { exports: Record<string, unknown> };
type ModuleFactory = (
  require: (request: string) => unknown,
  moduleRecord: ModuleRecord,
  exports: Record<string, unknown>,
  react: ReactRuntime,
) => void;

interface TestCaseResult {
  testCaseId: string;
  name: string;
  passed: boolean;
  actual: unknown;
  runtimeMs: number;
  error: string | null;
}

function getCorsHeaders(req: Request) {
  const configuredOrigin = Deno.env.get("APP_ORIGIN");
  const requestOrigin = req.headers.get("origin");
  const isLocalOrigin =
    requestOrigin?.startsWith("http://localhost:") ||
    requestOrigin?.startsWith("http://127.0.0.1:");

  return {
    "Access-Control-Allow-Origin":
      requestOrigin && (requestOrigin === configuredOrigin || isLocalOrigin)
        ? requestOrigin
        : "null",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

function isAuthorized(req: Request) {
  const authHeader = req.headers.get("authorization");
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, "");
  const requestTokens = [
    bearerToken,
    req.headers.get("apikey"),
    req.headers.get("x-app-service-key"),
  ].filter((token): token is string => !!token);

  if (requestTokens.length === 0) return false;

  // Local Supabase exposes both JWT-style service keys and sb_secret_* keys.
  // Hosted projects may expose only one of these names depending on key setup.
  const acceptedKeys = [
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),
    Deno.env.get("SERVICE_ROLE_KEY"),
    Deno.env.get("SUPABASE_SECRET_KEY"),
    Deno.env.get("SECRET_KEY"),
    Deno.env.get("APP_SERVICE_KEY"),
  ].filter((key): key is string => !!key);

  if (requestTokens.some((token) => acceptedKeys.includes(token))) return true;

  return false;
}

function codeSizeIsAllowed(code: string) {
  return new TextEncoder().encode(code).length <= maxCodeBytes;
}

function normalizeError(error: unknown) {
  return error instanceof Error ? error.message : String(error);
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
  let timeout: number | undefined;
  const timeoutTask = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => {
      reject(new Error(`Execution timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([task, timeoutTask]);
  } finally {
    if (timeout !== undefined) {
      clearTimeout(timeout);
    }
  }
}

function getExportedFunction(
  code: string,
  functionName: string,
  runtimeBindings: Record<string, unknown> = {},
) {
  if (/\beval\s*\(/.test(code)) {
    throw new Error("Use of eval is not allowed");
  }

  const runtimeNames = Object.keys(runtimeBindings);
  const runtimeValues = Object.values(runtimeBindings);
  const factory = new Function(
    ...strictModeBlockedGlobalNames,
    ...runtimeNames,
    `"use strict";\n${code}\nreturn typeof ${functionName} !== "undefined" ? ${functionName} : typeof __defaultExport !== "undefined" ? __defaultExport : undefined;`,
  );
  return factory(...strictModeBlockedGlobalValues, ...runtimeValues) as unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function isValidSubmissionFileName(name: string) {
  return /^(?!.*(?:^|\/)\.\.(?:\/|$))(?:[A-Za-z0-9_-]+\/)*[A-Za-z0-9_-]+\.(?:js|jsx|css)$/.test(
    name,
  );
}

function normalizeSubmissionFiles(files: unknown): SubmissionFile[] {
  if (!Array.isArray(files)) return [];

  const seen = new Set<string>();
  const normalized: SubmissionFile[] = [];

  for (const item of files) {
    if (!isRecord(item)) continue;

    const name = typeof item.name === "string" ? item.name.trim() : "";
    const content = typeof item.content === "string" ? item.content : "";
    if (!name || !isValidSubmissionFileName(name) || seen.has(name)) continue;

    normalized.push({
      name,
      language: name.endsWith(".css") ? "css" : "javascript",
      content,
    });
    seen.add(name);

    if (normalized.length >= 8) break;
  }

  return normalized;
}

function parseComponentFiles(code: string): SubmissionFile[] {
  try {
    const parsed = JSON.parse(code);
    if (
      isRecord(parsed) &&
      parsed.kind === "nxt-quiz/code-files" &&
      parsed.version === 1
    ) {
      const files = normalizeSubmissionFiles(parsed.files);
      if (files.length > 0) return files;
    }
  } catch {
    // Legacy single-file answers are plain code strings.
  }

  return [{ name: "App.jsx", language: "javascript", content: code }];
}

function toModuleId(name: string) {
  return `./${name}`;
}

function resolveRelativeModule(request: string, fromId: string) {
  if (!request.startsWith(".")) return request;

  const baseParts = fromId.replace(/^\.\//, "").split("/");
  baseParts.pop();

  const parts = request.split("/");
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      baseParts.pop();
    } else {
      baseParts.push(part);
    }
  }

  return `./${baseParts.join("/")}`;
}

function compileComponentModule(file: SubmissionFile) {
  if (!babelTransform) throw new Error("Babel is unavailable.");

  const result = babelTransform(file.content, {
    presets: [
      ["env", { modules: "commonjs", targets: { esmodules: true } }],
      ["react", { runtime: "classic" }],
    ],
    filename: file.name,
    sourceType: "unambiguous",
  });

  return result.code || "";
}

function getComponentFromFiles(
  files: SubmissionFile[],
  functionName: string,
): unknown {
  if (!React) throw new Error("React is unavailable.");

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
      new Function("require", "module", "exports", "React", compiled) as ModuleFactory,
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
    if (!factory) {
      throw new Error(`Cannot find module: ${request}`);
    }

    const cached = cache.get(id);
    if (cached) return cached.exports;

    const moduleRecord = { exports: {} as Record<string, unknown> };
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
    files.find((file) => file.name.endsWith(".jsx") || file.name.endsWith(".js"));

  if (!entryFile) {
    throw new Error("No JavaScript entry file found.");
  }

  // Ensure the entry module is loaded (triggers require chains for all imports)
  requireFrom(toModuleId(entryFile.name), "./App.jsx");

  // If functionName is NOT "App", search all loaded modules for a matching
  // named export or default export whose .name matches the target.
  if (functionName !== "App") {
    for (const [, moduleRecord] of cache) {
      const exports = moduleRecord.exports;
      if (!isRecord(exports)) continue;

      // Check for a named export matching functionName
      if (typeof exports[functionName] === "function") {
        return exports[functionName];
      }

      // Check if the default export's function name matches
      if (
        typeof exports.default === "function" &&
        (exports.default as { name?: string }).name === functionName
      ) {
        return exports.default;
      }
    }
  }

  // Fallback: use the entry file's exports (for App or single-file challenges)
  const entry = cache.get(toModuleId(entryFile.name));
  if (!entry || !isRecord(entry.exports)) return null;

  return entry.exports[functionName] || entry.exports.default || entry.exports.App;
}

async function executeFunction(
  code: string,
  functionName: string,
  testCases: FunctionTestCase[],
): Promise<TestCaseResult[]> {
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
): Promise<TestCaseResult[]> {
  await loadReactDeps();

  if (!React || !renderToString || !babelTransform) {
    throw new Error("React execution dependencies are unavailable.");
  }

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
        Promise.resolve(renderToString(React.createElement(component, tc.props || {}))),
        perTestTimeoutMs,
      );
      const runtimeMs = Math.round(performance.now() - start);
      const htmlLower = html.toLowerCase();
      const containsAll = (tc.expectedContains || []).every((text) =>
        htmlLower.includes(text.toLowerCase())
      );
      const hasElement =
        !tc.expectedElement || htmlLower.includes(`<${tc.expectedElement.toLowerCase()}`);

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

serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!isAuthorized(req)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code : "";
    const testCases = Array.isArray(body.testCases)
      ? body.testCases.slice(0, maxTestCases)
      : [];
    const functionName =
      typeof body.functionName === "string" ? body.functionName : "";
    const challengeMode =
      body.challengeMode === "component" ? "component" : "function";

    if (!code || testCases.length === 0 || !functionName) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!codeSizeIsAllowed(code)) {
      return new Response(JSON.stringify({ error: "Code is too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!functionNamePattern.test(functionName)) {
      return new Response(JSON.stringify({ error: "Invalid function name" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results =
      challengeMode === "component"
        ? await executeComponent(code, functionName, testCases as ComponentTestCase[])
        : await executeFunction(code, functionName, testCases as FunctionTestCase[]);

    const passed = results.filter((result) => result.passed).length;
    const failed = results.length - passed;

    return new Response(
      JSON.stringify({
        success: true,
        results,
        summary: { passed, failed, total: results.length },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        results: [],
        summary: { passed: 0, failed: 0, total: 0 },
        error: normalizeError(error),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
