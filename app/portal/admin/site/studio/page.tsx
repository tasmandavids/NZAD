// ============================================================================
//  /portal/admin/site/studio — Site Builder v2 (Studio) entry / template picker.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { StudioHome, type StudioPageRow } from "@/components/builder/StudioHome";

export const metadata = { title: "Studio · Site Builder v2" };

export default async function StudioIndexPage() {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let studioId: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from("profiles").select("studio_id, role").eq("id", user.id).single();
    if (profile?.role === "admin") studioId = (profile.studio_id as string) ?? null;
  }

  let pages: StudioPageRow[] = [];
  let provisioned = true;
  if (studioId) {
    try {
      const { data, error } = await supabase
        .from("site_builder_documents")
        .select("page_id, template_id, updated_at, site_pages!inner(title)")
        .eq("studio_id", studioId)
        .order("updated_at", { ascending: false });
      if (error) provisioned = false;
      pages = (data ?? []).map((r) => {
        const sp = Array.isArray(r.site_pages) ? r.site_pages[0] : r.site_pages;
        return {
          pageId: r.page_id as string,
          title: (sp as { title: string } | null)?.title ?? "Untitled",
          templateId: (r.template_id as string | null) ?? null,
          updatedAt: (r.updated_at as string | null) ?? null,
        };
      });
    } catch {
      provisioned = false;
    }
  }

  return <StudioHome pages={pages} provisioned={provisioned} />;
}
