import { canonicalAppUrl } from "@/lib/app-url";

export async function resolveAppOriginFromHeaders(): Promise<string> {
  if (process.env.NODE_ENV === "development") {
    const { headers } = await import("next/headers");
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "http";
    if (host) return `${proto}://${host}`;
  }

  return canonicalAppUrl();
}
