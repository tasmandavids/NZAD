/** True when the URL is a Supabase Storage asset we can pass to next/image. */
export function isOptimizableImageUrl(url: string): boolean {
  try {
    const host = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").hostname;
    return !!host && new URL(url).hostname === host;
  } catch {
    return false;
  }
}
