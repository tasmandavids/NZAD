// ============================================================================
//  /portal/admin  —  server component.
//  Fetches live stats + real class capacity data (migration 0003).
//  Falls back to MOCK_HEAT if no classes have been created yet.
// ============================================================================

import dynamic from "next/dynamic";
import { getTranslations } from "@/lib/i18n/server";
import { getPortalSession } from "@/lib/portal/session";
import { MOCK_HEAT, UNSCHEDULED, type Stat, type HeatClass, type ClassBlock } from "@/components/admin/dashboard/types";

const AdminDashboard = dynamic(
  () => import("@/components/admin/dashboard/AdminDashboard").then((m) => m.AdminDashboard),
  {
    loading: () => (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    ),
  },
);

// Full day names indexed by JS getDay() convention: 0=Sun … 6=Sat
const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function AdminDashboardPage() {
  const session = await getPortalSession();
  if (!session) throw new Error("Not signed in");

  const t = await getTranslations("admin.dashboard.stats");
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

  const stats: Stat[] = [
    { id: "students", label: t("activeStudents"), value: studentsRes.count ?? 0, format: "number", hint: t("activeStudentsHint") },
    { id: "revenue",  label: t("revenueThisMonth"), value: revenue, format: "currency", hint: t("revenueHint") },
    { id: "today",    label: t("classesToday"), value: todayRes.count ?? 0, format: "number", hint: t("classesTodayHint") },
  ];

  // ── Build heatmap from real data (or fall back to mock) ──────────────────
  const rows = capacityRes.data ?? [];
  let heat: HeatClass[];
  let heatDays: string[] | undefined;
  let heatTimes: string[] | undefined;

  if (rows.length > 0) {
    // Compute unique days and times from actual class data
    const uniqueDayNums = [...new Set(rows.map((r) => r.day_of_week as number))].sort();
    const uniqueTimesRaw = [
      ...new Set(rows.map((r) => (r.start_time as string | null) ?? "00:00")),
    ].sort();

    heatDays = uniqueDayNums.map((d) => DAY_SHORT[d]);
    // Strip seconds: "15:30:00" → "15:30"
    heatTimes = uniqueTimesRaw.map((t) => t.slice(0, 5));

    const dayIdx = new Map(uniqueDayNums.map((d, i) => [d, i]));
    const timeIdx = new Map(uniqueTimesRaw.map((t, i) => [t, i]));

    heat = rows.map((r) => ({
      id: r.id as string,
      name: r.name as string,
      // No room column yet — use discipline as a readable label
      room: (r.discipline as string | null) ?? tCommon("yourStudio"),
      day:  dayIdx.get(r.day_of_week as number) ?? 0,
      slot: timeIdx.get((r.start_time as string | null) ?? "00:00") ?? 0,
      enrolled: Number(r.enrolled ?? 0),
      capacity: Number(r.capacity ?? 0),
    }));
  } else {
    // No classes in DB yet — show the designed mock so the UI isn't empty
    heat = MOCK_HEAT;
  }

  // ── Build schedule builder classes (fall back to mock if no classes yet) ──
  const allClassRows = allClassesRes.data ?? [];
  let scheduleClasses: ClassBlock[];
  if (allClassRows.length > 0) {
    scheduleClasses = allClassRows.map((r) => {
      // Compute durationMin from start_time / end_time if both present
      let durationMin = 60;
      if (r.start_time && r.end_time) {
        const [sh, sm] = (r.start_time as string).split(":").map(Number);
        const [eh, em] = (r.end_time as string).split(":").map(Number);
        durationMin = (eh * 60 + em) - (sh * 60 + sm);
      }
      // Normalise time "15:30:00" → "15:30"
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
      heatDays={heatDays}
      heatTimes={heatTimes}
      scheduleClasses={scheduleClasses}
    />
  );
}

