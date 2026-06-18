import type { NextConfig } from "next";

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

// Baseline security headers applied to every response. Deliberately conservative
// so they don't break the app (Stripe.js, WebGL, Supabase Realtime, Next inline
// runtime). A Content-Security-Policy is intentionally NOT set here yet — it needs
// per-source allow-listing + nonces and dedicated testing (tracked as a follow-up).
const securityHeaders = [
  // Stop MIME-sniffing responses away from their declared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow the app being framed by other origins (clickjacking).
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Don't leak full URLs/paths to third parties via the Referer header.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Drop powerful features the app doesn't use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  // Force HTTPS for 2 years incl. subdomains (ignored by browsers over plain
  // http://localhost, so it's safe in dev and correct in production).
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
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
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
