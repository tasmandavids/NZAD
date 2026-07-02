import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Allow next/image to optimise images served from the studio's Supabase
// Storage bucket (public site-images). Derived from NEXT_PUBLIC_SUPABASE_URL so
// it tracks the configured project automatically.
function supabaseImageHostname(): string | null {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
  } catch {
    return null;
  }
}

const supaHost = supabaseImageHostname();

// Baseline HTTP security headers applied to every response. Deliberately
// conservative — no Content-Security-Policy (which needs per-app tuning to
// avoid breaking inline styles/scripts). HSTS is ignored by browsers over
// plain http://localhost, so it's safe in dev and correct in production.
const securityHeaders = [
  // Stop MIME-sniffing responses away from their declared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow the app being framed by other origins (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs/paths to third parties via the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful browser features the app doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS for 2 years incl. subdomains.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Monorepo-adjacent lockfile at ~/package-lock.json confuses output tracing.
  outputFileTracingRoot: import.meta.dirname,
  typescript: {
    ignoreBuildErrors: false,
  },
  // Tree-shake heavy barrel-export libraries so each route only bundles the
  // components it actually imports. framer-motion is pulled into ~66 client
  // components; recharts into the admin dashboards. Build-time only — no
  // runtime or auth behaviour change.
  experimental: {
    optimizePackageImports: ["framer-motion", "recharts"],
  },
  images: {
    remotePatterns: supaHost
      ? [
          {
            protocol: "https",
            hostname: supaHost,
            pathname: "/storage/v1/object/public/**",
          },
        ]
      : [],
  },
  async headers() {
    return [
      {
        source: "/:path*\\.(svg|jpg|jpeg|png|webp|gif|ico|woff|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default withNextIntl(nextConfig);
