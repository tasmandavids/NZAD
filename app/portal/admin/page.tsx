// ============================================================================
//  /portal/admin  —  server component.
//  Fetches live stats + real class capacity data (migration 0003).
//  Falls back to MOCK_HEAT if no classes have been created yet.
// ============================================================================

import nextDynamic from "next/dynamic";
import { getTranslations } from "@/lib/i18n/server";
import { getPortalSession } from "@/lib/portal/session";
import { MOCK_HEAT, UNSCHEDULED, type StatData, type HeatClass, type ClassBlock } from "@/components/admin/dashboard/types";

export const dynamic = "force-dynamic";

const AdminDashboard = nextDynamic(
  () => import("@/components/admin/dashboard/AdminDashboard").then((m) => m.AdminDashboard),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    ),
  },
);

export default async function AdminDashboardPage() {
  const session = await getPortalSession();
  if (!session) throw new Error("Not signed in");

  const tCommon = await getTranslations("common");

  const { supabase, studioId } = session;

  const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
  const todayDow = new Date().getDay();

  // Run all reads in parallel.
  const [studioRes, studentsRes, paidRes, todayRes, capacityRes, allClassesRes] = await Promise.all([
    supabase.from("studios").select("name").eq("id", studioId).single(),

    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "student")
      .eq("studio_id", studioId),

    supabase
      .from("invoices")
      .select("amount_cents")
      .eq("status", "paid")
      .gte("created_at", startOfMonth),

    supabase
      .from("classes")
      .select("id", { count: "exact", head: true })
      .eq("day_of_week", todayDow),

    // Real capacity data from migration 0003 view. Skip Sunday (0) — heatmap shows Mon–Sat.
    supabase
      .from("class_capacity")
      .select("id, name, discipline, day_of_week, start_time, enrolled, capacity")
      .neq("day_of_week", 0)
      .order("day_of_week")
      .order("start_time"),

    // All classes for the schedule builder (both scheduled and unscheduled).
    supabase
      .from("classes")
      .select("id, name, discipline, level, day_of_week, start_time, end_time")
      .order("name"),
  ]);

  const revenue =
    (paidRes.data ?? []).reduce((sum, r) => sum + (r.amount_cents ?? 0), 0) / 100;

  const stats: StatData[] = [
    { id: "students", value: studentsRes.count ?? 0, format: "number" },
    { id: "revenue", value: revenue, format: "currency" },
    { id: "today", value: todayRes.count ?? 0, format: "number" },
  ];

  // ── Build heatmap from real data (or fall back to mock) ──────────────────
  const rows = capacityRes.data ?? [];
  let heat: HeatClass[];
  let heatDayDows: number[] | undefined;
  let heatTimes: string[] | undefined;

  if (rows.length > 0) {
    const uniqueDayNums = [...new Set(rows.map((r) => r.day_of_week as number))].sort();
    const uniqueTimesRaw = [
      ...new Set(rows.map((r) => (r.start_time as string | null) ?? "00:00")),
    ].sort();

    heatDayDows = uniqueDayNums;
    heatTimes = uniqueTimesRaw.map((t) => t.slice(0, 5));

    const dayIdx = new Map(uniqueDayNums.map((d, i) => [d, i]));
    const timeIdx = new Map(uniqueTimesRaw.map((t, i) => [t, i]));

    heat = rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      room: (r.discipline as string | null) ?? tCommon("yourStudio"),
      day: dayIdx.get(r.day_of_week as number) ?? 0,
      slot: timeIdx.get((r.start_time as string | null) ?? "00:00") ?? 0,
      enrolled: Number(r.enrolled ?? 0),
      capacity: Number(r.capacity ?? 0),
    }));
  } else {
    heat = MOCK_HEAT;
  }

  // ── Build schedule builder classes (fall back to mock if no classes yet) ──
  const allClassRows = allClassesRes.data ?? [];
  let scheduleClasses: ClassBlock[];
  if (allClassRows.length > 0) {
    scheduleClasses = allClassRows.map((r) => {
      let durationMin = 60;
      if (r.start_time && r.end_time) {
        const [sh, sm] = (r.start_time as string).split(":").map(Number);
        const [eh, em] = (r.end_time as string).split(":").map(Number);
        durationMin = (eh * 60 + em) - (sh * 60 + sm);
      }
      const startTime = r.start_time ? (r.start_time as string).slice(0, 5) : null;
      return {
        id: r.id as string,
        name: r.name as string,
        discipline: (r.discipline as string | null) ?? "",
        level: (r.level as string | null) ?? "",
        durationMin,
        dayOfWeek: (r.day_of_week as number | null) ?? null,
        startTime,
      };
    });
  } else {
    scheduleClasses = UNSCHEDULED;
  }

  return (
    <AdminDashboard
      studioName={studioRes.data?.name ?? tCommon("yourStudio")}
      stats={stats}
      heat={heat}
      heatDayDows={heatDayDows}
      heatTimes={heatTimes}
      scheduleClasses={scheduleClasses}
    />
  );
}
