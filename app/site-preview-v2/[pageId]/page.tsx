// ============================================================================
//  /site-preview-v2/[pageId] — read-only render of a Studio (v2) document.
//  Admin-gated via RLS (the admin can read their studio's draft documents);
//  published documents are also publicly readable. Live public-site rendering
//  is intentionally left untouched — this preview route is fully separate.
// ============================================================================

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeDocument } from "@/lib/builder/document";
import { PublicDocument } from "@/components/builder/PublicDocument";

export default async function StudioPreviewPage({ params }: { params: Promise<{ pageId: string }> }) {
  const { pageId } = await params;
  const supabase = await createClient();

  let document = null;
  try {
    const { data } = await supabase
      .from("site_builder_documents")
      .select("document")
      .eq("page_id", pageId)
      .maybeSingle();
    if (data?.document) document = normalizeDocument(data.document);
  } catch {
    document = null;
  }

  if (!document) notFound();

  return <PublicDocument doc={document} />;
}
