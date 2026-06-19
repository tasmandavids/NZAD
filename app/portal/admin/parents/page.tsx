// ============================================================================
//  /portal/admin/parents — Parent roster with linked children.
// ============================================================================

import { requirePortalSession } from "@/lib/portal/session";
import ParentsManager from "@/components/admin/parents/ParentsManager";

export type ParentChild = {
  id: string;
  name: string | null;
};

export type ParentRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  createdAt: string;
  children: ParentChild[];
};

export default async function ParentsPage() {
  const { supabase, studioId } = await requirePortalSession();

  const { data } = await supabase
    .from("profiles")
    .select(`
      id, full_name, email, phone, created_at,
      guardianships!guardian_id (
        student_id,
        profiles!student_id ( id, full_name )
      )
    `)
    .eq("studio_id", studioId ?? "")
    .eq("role", "parent")
    .order("full_name");

  const parents: ParentRow[] = (data ?? []).map((p) => {
    const children = (
      p.guardianships as unknown as {
        student_id: string;
        profiles: { id: string; full_name: string | null } | null;
      }[]
    ).map((g) => ({
      id: g.profiles?.id ?? g.student_id,
      name: g.profiles?.full_name ?? null,
    }));

    return {
      id: p.id,
      name: p.full_name,
      email: p.email,
      phone: p.phone,
      createdAt: p.created_at,
      children,
    };
  });

  return <ParentsManager parents={parents} />;
}
