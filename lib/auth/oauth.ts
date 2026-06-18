/** Build the Supabase OAuth redirect URL with a safe internal `next` path. */
export function authCallbackUrl(next: string): string {
  const origin = window.location.origin;
  const safeNext = sanitizeNextPath(next);
  return `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
}

export function sanitizeNextPath(path: string | null | undefined, fallback = "/portal"): string {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return fallback;
  return path;
}
