// ============================================================================
//  Tenant resolution — turn an incoming host into a studio.
//    <slug>.olune.app          → match studios.slug
//    book.mystudio.co.nz        → match studios.custom_domain
//    <slug>.localhost:3000      → local dev
//  Studio identity is public-readable (see RLS), so this works pre-login.
// ============================================================================

import { createClient } from "./supabase/server";
import type { Studio } from "./types";

const ROOT = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "olune.app";

/** Extract the studio slug from a host, or null if this is a custom/root domain. */
export function slugFromHost(host: string | null): string | null {
  if (!host) return null;
  const hostname = host.split(":")[0]; // drop port

  const onRoot = hostname === ROOT || hostname.endsWith(`.${ROOT}`);
  const onLocal = hostname === "localhost" || hostname.endsWith(".localhost");
  if (!onRoot && !onLocal) return null; // custom domain → resolve by domain instead

  const sub = hostname.replace(`.${ROOT}`, "").replace(".localhost", "");
  if (!sub || sub === ROOT || sub === "localhost" || sub === "www" || sub === "app") {
    return null;
  }
  return sub;
}

/** Resolve the studio for a host. Returns null on the marketing root / unknown host. */
export async function resolveStudio(host: string | null): Promise<Studio | null> {
  if (!host) return null;
  const supabase = await createClient();
  const slug = slugFromHost(host);

  const query = supabase.from("studios").select("*");
  const { data } = slug
    ? await query.eq("slug", slug).single()
    : await query.eq("custom_domain", host.split(":")[0]).single();

  if (!data) return null;
  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    customDomain: data.custom_domain,
    status: data.status,
  };
}
