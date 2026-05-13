import { NextResponse } from "next/server";
import { normalizeEditorFiles } from "@/lib/code-answer";
import { isLocalEnvironment, isLocalSupabaseUrl } from "@/lib/local-user";
import { renderComponentPreviewLocally } from "@/lib/local-code-runner";
import { assertSameOriginRequest } from "@/lib/request-security";

const maxPreviewSourceBytes = 250_000;

function isLocalRequest(request: Request) {
  const host = request.headers.get("host") ?? "";
  return host.startsWith("localhost:") || host.startsWith("127.0.0.1:");
}

function isLocalPreviewEnabled(request: Request) {
  return (
    process.env.NODE_ENV !== "production" &&
    (isLocalEnvironment() || isLocalSupabaseUrl() || isLocalRequest(request))
  );
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
      })[char] ?? char,
  );
}

function createPreviewDocument(renderedHtml: string, cssText: string) {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta
      http-equiv="Content-Security-Policy"
      content="default-src 'none'; style-src 'unsafe-inline'; img-src data: blob: https:; font-src data: https:; base-uri 'none'; object-src 'none'; form-action 'none'"
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
    </style>
    <style>${escapeStyle(cssText)}</style>
  </head>
  <body>
    <div id="mountNode">${renderedHtml}</div>
  </body>
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

export async function POST(request: Request) {
  const originError = assertSameOriginRequest(request);
  if (originError) return originError;

  if (!isLocalPreviewEnabled(request)) {
    return NextResponse.json(
      { error: "Local preview rendering is disabled" },
      { status: 403 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const files = normalizeEditorFiles(body.files, []);

  if (files.length === 0) {
    return NextResponse.json(
      { error: "No preview files provided", srcDoc: createErrorDocument("No preview files provided") },
      { status: 400 },
    );
  }

  const sourceBytes = files.reduce(
    (totalBytes, file) => totalBytes + new TextEncoder().encode(file.content).length,
    0,
  );

  if (sourceBytes > maxPreviewSourceBytes) {
    return NextResponse.json(
      {
        error: "Preview source is too large to compile.",
        srcDoc: createErrorDocument("Preview source is too large to compile."),
      },
      { status: 413 },
    );
  }

  try {
    const cssText = files
      .filter((file) => file.language === "css")
      .map((file) => `/* ${file.name} */\n${file.content}`)
      .join("\n\n");
    const renderedHtml = renderComponentPreviewLocally({ files });

    return NextResponse.json({
      srcDoc: createPreviewDocument(renderedHtml, cssText),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    return NextResponse.json(
      { error: message, srcDoc: createErrorDocument(error) },
      { status: 400 },
    );
  }
}
