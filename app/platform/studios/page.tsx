import { createAdminClient } from "@/lib/supabase/admin";
import { StudiosManager } from "@/components/platform/StudiosManager";
import type { PlatformStudioSummary } from "@/lib/platform/types";

export default async function PlatformStudiosPage() {
  const admin = createAdminClient();

  const { data: studios } = await admin
    .from("studios")
    .select("id, name, slug, status, custom_domain, created_at")
    .order("created_at", { ascending: false });

  const studioIds = (studios ?? []).map((s) => s.id);

  const [adminsRes, studentsRes] = await Promise.all([
    admin
      .from("profiles")
      .select("studio_id, full_name, email")
      .eq("role", "admin")
      .in("studio_id", studioIds.length ? studioIds : ["00000000-0000-0000-0000-000000000000"]),
    admin
      .from("profiles")
      .select("studio_id")
      .eq("role", "student")
      .in("studio_id", studioIds.length ? studioIds : ["00000000-0000-0000-0000-000000000000"]),
  ]);

  const adminByStudio = new Map<string, { name: string | null; email: string | null }>();
  for (const p of adminsRes.data ?? []) {
    if (p.studio_id && !adminByStudio.has(p.studio_id)) {
      adminByStudio.set(p.studio_id, { name: p.full_name, email: p.email });
    }
  }

  const studentCounts = new Map<string, number>();
  for (const p of studentsRes.data ?? []) {
    if (p.studio_id) {
      studentCounts.set(p.studio_id, (studentCounts.get(p.studio_id) ?? 0) + 1);
    }
  }

  const summaries: PlatformStudioSummary[] = (studios ?? []).map((s) => {
    const owner = adminByStudio.get(s.id);
    return {
      id: s.id,
      name: s.name,
      slug: s.slug,
      status: s.status,
      customDomain: s.custom_domain,
      createdAt: s.created_at,
      ownerName: owner?.name ?? null,
      ownerEmail: owner?.email ?? null,
      studentCount: studentCounts.get(s.id) ?? 0,
      adminCount: 1,
    };
  });

  return <StudiosManager studios={summaries} />;
}
