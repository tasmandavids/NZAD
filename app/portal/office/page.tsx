// ============================================================================
//  /portal/office — Front-desk home dashboard.
// ============================================================================

import Link from "next/link";
import { requirePortalSession } from "@/lib/portal/session";
import { getWeekRange } from "@/lib/staff/week";
import { formatTimeShort } from "@/lib/staff/week";

export default async function OfficeHomePage() {
  const { supabase, studioId, userId, role } = await requirePortalSession();
  if (role !== "office") {
    const { redirect } = await import("next/navigation");
    redirect("/portal/admin");
  }

  const today = new Date().toISOString().slice(0, 10);
  const { weekStart, weekEnd } = getWeekRange();

  const [profileRes, shiftsRes, studioShiftsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("full_name")
      .eq("id", userId)
      .single(),

    supabase
      .from("staff_shifts")
      .select("id, shift_date, start_time, end_time, location_name, notes")
      .eq("studio_id", studioId ?? "")
      .eq("staff_id", userId)
      .gte("shift_date", today)
      .lte("shift_date", weekEnd)
      .order("shift_date")
      .order("start_time"),

    supabase
      .from("staff_shifts")
      .select(`
        id, shift_date, start_time, end_time, location_name,
        profiles!staff_id ( full_name )
      `)
      .eq("studio_id", studioId ?? "")
      .eq("shift_date", today)
      .order("start_time"),
  ]);

  const myShifts = shiftsRes.data ?? [];
  const todayStudio = studioShiftsRes.data ?? [];

  const quickLinks = [
    { href: "/portal/admin/parents", label: "Parents" },
    { href: "/portal/admin/students", label: "Students" },
    { href: "/portal/admin/leads", label: "Leads" },
    { href: "/portal/admin/classes", label: "Classes" },
    { href: "/portal/admin/messages", label: "Messages" },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <h1 className="text-2xl font-black text-ink">
          Welcome, {profileRes.data?.full_name ?? "there"}
        </h1>
        <p className="text-sm text-muted">
          {today} · Week of {weekStart}
        </p>
      </div>

      <section className="rounded-2xl border border-[--hair] bg-surface p-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Your upcoming shifts</h2>
        {myShifts.length === 0 ? (
          <p className="text-sm text-muted">No shifts scheduled this week.</p>
        ) : (
          <ul className="space-y-2">
            {myShifts.map((s) => (
              <li key={s.id} className="text-sm text-ink">
                <span className="font-medium">{s.shift_date as string}</span>
                {" · "}
                {formatTimeShort((s.start_time as string).slice(0, 5))}–
                {formatTimeShort((s.end_time as string).slice(0, 5))}
                {s.location_name ? ` · ${s.location_name as string}` : ""}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-[--hair] bg-surface p-5">
        <h2 className="mb-3 text-lg font-bold text-ink">Who&apos;s working today</h2>
        {todayStudio.length === 0 ? (
          <p className="text-sm text-muted">No shifts on the roster for today.</p>
        ) : (
          <ul className="space-y-2">
            {todayStudio.map((s) => {
              const prof = s.profiles as unknown as { full_name: string | null } | null;
              return (
                <li key={s.id} className="text-sm text-ink">
                  <span className="font-medium">{prof?.full_name ?? "Staff"}</span>
                  {" · "}
                  {formatTimeShort((s.start_time as string).slice(0, 5))}–
                  {formatTimeShort((s.end_time as string).slice(0, 5))}
                  {s.location_name ? ` · ${s.location_name as string}` : ""}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted">Quick links</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {quickLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-xl border border-[--hair] bg-surface px-4 py-3 text-sm font-medium text-ink transition hover:shadow-md"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
