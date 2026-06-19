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

const nextConfig: NextConfig = {
  // Monorepo-adjacent lockfile at ~/package-lock.json confuses output tracing.
  outputFileTracingRoot: import.meta.dirname,
  eslint: {
    // Pre-existing lint debt across marketing/portal pages; compile + tsc are clean.
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
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
    ];
  },
};

export default nextConfig;
