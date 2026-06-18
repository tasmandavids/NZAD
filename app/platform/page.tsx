import { createAdminClient } from "@/lib/supabase/admin";
import { PlatformDashboard } from "@/components/platform/PlatformDashboard";

export default async function PlatformHomePage() {
  const admin = createAdminClient();

  const [studiosRes, tasksRes, threadsRes, studentsRes] = await Promise.all([
    admin.from("studios").select("id, name, slug, status, created_at").order("created_at", { ascending: false }),
    admin
      .from("platform_tasks")
      .select("id, title, priority, due_at")
      .neq("status", "done")
      .order("priority")
      .limit(6),
    admin
      .from("platform_support_threads")
      .select("id, subject, priority, studios(name)")
      .neq("status", "resolved")
      .order("updated_at", { ascending: false })
      .limit(5),
    admin.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
  ]);

  const studios = studiosRes.data ?? [];
  const trialCount = studios.filter((s) => s.status === "trial").length;
  const activeCount = studios.filter((s) => s.status === "active").length;
  const suspendedCount = studios.filter((s) => s.status === "suspended").length;

  const stats = [
    { id: "studios", label: "Total studios", value: studios.length, hint: `${activeCount} active` },
    { id: "trial", label: "On trial", value: trialCount },
    { id: "suspended", label: "Suspended", value: suspendedCount },
    { id: "students", label: "Students platform-wide", value: studentsRes.count ?? 0 },
  ];

  const recentStudios = studios.slice(0, 5).map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    status: s.status,
    createdAt: s.created_at,
  }));

  const openThreads = (threadsRes.data ?? []).map((t) => {
    const studio = t.studios as unknown as { name: string } | null;
    return {
      id: t.id,
      subject: t.subject,
      studioName: studio?.name ?? "Unknown",
      priority: t.priority,
    };
  });

  const openTasks = (tasksRes.data ?? []).map((t) => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    dueAt: t.due_at,
  }));

  return (
    <PlatformDashboard
      stats={stats}
      recentStudios={recentStudios}
      openTasks={openTasks}
      openThreads={openThreads}
    />
  );
}
