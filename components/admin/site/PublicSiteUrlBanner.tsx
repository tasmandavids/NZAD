// ============================================================================
//  components/admin/site/PublicSiteUrlBanner.tsx
//  Shows the correct public URL for the studio's website in local dev.
// ============================================================================

import { createClient } from "@/lib/supabase/server";

export async function PublicSiteUrlBanner() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return null;

  const { data: studio } = await supabase
    .from("studios")
    .select("slug")
    .eq("id", profile.studio_id)
    .single();

  if (!studio?.slug) return null;

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";
  const port = process.env.PORT ?? "3000";
  const publicUrl = `http://${studio.slug}.${root}:${port}`;

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-ink">
      <p className="font-medium">Your public website URL</p>
      <p className="mt-1 text-muted">
        Open{" "}
        <a href={publicUrl} className="font-semibold text-brand underline" target="_blank" rel="noreferrer">
          {publicUrl}
        </a>{" "}
        to preview what families see. Pages on plain <code className="text-xs">localhost</code> are the Olune
        platform, not your studio site.
      </p>
    </div>
  );
}
