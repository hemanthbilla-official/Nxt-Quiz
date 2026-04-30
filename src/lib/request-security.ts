import { NextResponse } from "next/server";

export function assertSameOriginRequest(request: Request) {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }

  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  try {
    if (new URL(origin).host !== host) {
      return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}
