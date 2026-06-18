// ============================================================================
//  components/admin/site/PublicSiteUrlBanner.tsx
//  Shows the correct public URL for the studio's website in local dev.
// ============================================================================

import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { publicSubdomainUrl } from "@/lib/site/domain-setup";

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
  const publicUrl = publicSubdomainUrl(studio.slug as string, root, process.env.PORT ?? "3000");

  return (
    <div className="rounded-xl border border-brand/30 bg-brand/5 px-4 py-3 text-sm text-ink">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium">Your public website URL</p>
          <p className="mt-1 text-muted">
            Open{" "}
            <a href={publicUrl} className="font-semibold text-brand underline" target="_blank" rel="noreferrer">
              {publicUrl.replace(/^https?:\/\//, "")}
            </a>{" "}
            to preview what families see.
            {root === "localhost" && (
              <>
                {" "}
                Pages on plain <code className="text-xs">localhost</code> are the Olune platform, not your studio
                site.
              </>
            )}
          </p>
        </div>
        <Link
          href="/portal/admin/site/domain"
          className="shrink-0 rounded-full border border-brand/40 bg-surface px-4 py-1.5 text-xs font-semibold text-brand transition hover:bg-brand/10"
        >
          Connect your domain →
        </Link>
      </div>
    </div>
  );
}
