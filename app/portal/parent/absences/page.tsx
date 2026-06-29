import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AbsenceManager } from "@/components/portal/parent/AbsenceManager";
import { reportAbsence, requestMakeup } from "./actions";

export default async function AbsencesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select(`
      student_id,
      profiles!student_id (
        full_name,
        enrollments (
          id, status,
          classes ( id, name, day_of_week, start_time )
        )
      )
    `)
    .eq("guardian_id", user.id);

  const studentIds = (guardianships ?? []).map((g) => g.student_id as string);

  const [absencesResult, creditsResult] = await Promise.all([
    studentIds.length
      ? supabase
          .from("student_absences")
          .select(`
            id, absence_date, reason, makeup_status, makeup_date,
            profiles!student_id ( full_name ),
            classes ( name )
          `)
          .in("student_id", studentIds)
          .order("absence_date", { ascending: false })
          .limit(50)
      : Promise.resolve({ data: [] }),

    studentIds.length
      ? supabase
          .from("makeup_credits")
          .select("credits, used, expires_at, profiles!student_id ( full_name )")
          .in("student_id", studentIds)
      : Promise.resolve({ data: [] }),
  ]);

  const children = (guardianships ?? []).map((g) => {
    const profile = g.profiles as unknown as {
      full_name: string | null;
      enrollments: { id: string; status: string; classes: { id: string; name: string; day_of_week: number; start_time: string | null } | null }[];
    } | null;
    const activeClasses = (profile?.enrollments ?? [])
      .filter((e) => e.status === "active" && e.classes)
      .map((e) => ({
        id: e.classes!.id,
        name: e.classes!.name,
        dayOfWeek: e.classes!.day_of_week,
        startTime: e.classes!.start_time,
      }));
    return {
      studentId: g.student_id as string,
      name: profile?.full_name ?? null,
      classes: activeClasses,
    };
  });

  const absences = (absencesResult.data ?? []).map((a) => {
    const p = a.profiles as unknown as { full_name: string | null } | null;
    const c = a.classes as unknown as { name: string } | null;
    return {
      id: a.id as string,
      studentName: p?.full_name ?? null,
      className: c?.name ?? "Unknown class",
      absenceDate: a.absence_date as string,
      reason: a.reason as string,
      makeupStatus: a.makeup_status as string,
      makeupDate: (a.makeup_date as string | null) ?? null,
    };
  });

  const makeupCredits = (creditsResult.data ?? []).map((c) => {
    const p = c.profiles as unknown as { full_name: string | null } | null;
    return {
      studentName: p?.full_name ?? null,
      credits: c.credits as number,
      used: c.used as number,
      expiresAt: (c.expires_at as string | null) ?? null,
    };
  });

  return (
    <AbsenceManager
      absences={absences}
      makeupCredits={makeupCredits}
      onReport={reportAbsence}
      onRequestMakeup={requestMakeup}
      dancers={children}
    />
  );
}
