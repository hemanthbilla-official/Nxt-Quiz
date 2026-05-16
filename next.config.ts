import type { NextConfig } from "next";

function isLocalSupabaseUrl(url: string | undefined) {
  return !!url && /https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?/.test(url);
}

const isLocal =
  process.env.NODE_ENV !== "production" &&
  (process.env.ENVIRONMENT === "local" ||
    isLocalSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL));

const nextConfig: NextConfig = {
  // BUG-02: Forward ENVIRONMENT to client bundle as NEXT_PUBLIC_
  env: {
    NEXT_PUBLIC_ENVIRONMENT: process.env.ENVIRONMENT,
  },

  // STD-01: Security headers
  async headers() {
    // In local dev, allow connections to the local Supabase instance
    const connectSrc = isLocal
      ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co http://127.0.0.1:* ws://127.0.0.1:* http://localhost:* ws://localhost:*"
      : "connect-src 'self' https://*.supabase.co wss://*.supabase.co";

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://esm.sh",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "img-src 'self' data: blob: https:",
              "font-src 'self' data: https://fonts.gstatic.com",
              connectSrc,
              "frame-src 'self' blob:",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "object-src 'none'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },

  // STD-08: Root redirect via config instead of render-time redirect()
  async redirects() {
    return [
      { source: "/", destination: "/login", permanent: false },
    ];
  },
};

export default nextConfig;
