// ============================================================================
//  /portal/admin/students/[id] — Student detail + progress timeline.
//  Server component: fetches the student, their active enrollments, and the
//  full progress history (with the logging instructor's name).
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import ProgressTracker, {
  type ProgressEntry,
} from "@/components/admin/students/ProgressTracker";
import DeleteStudentButton from "@/components/admin/students/DeleteStudentButton";

export type StudentDetail = {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  classes: { id: string; name: string }[];
};

const DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const t = await getTranslations("admin.students.detail");
  const tShared = await getTranslations("admin.shared");

  const [studentRes, progressRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id, full_name, email, phone,
        enrollments!student_id (
          status,
          classes ( id, name, day_of_week, start_time )
        )
      `,
      )
      .eq("id", id)
      .single(),

    supabase
      .from("student_progress")
      .select(
        `
        id, notes, level, certifications, logged_at,
        instructor:profiles!instructor_id ( full_name )
      `,
      )
      .eq("student_id", id)
      .order("logged_at", { ascending: false }),
  ]);

  if (studentRes.error || !studentRes.data) notFound();
  const p = studentRes.data;

  const classes = (
    (p.enrollments as unknown as {
      status: string;
      classes: { id: string; name: string; day_of_week: number; start_time: string | null } | null;
    }[]) ?? []
  )
    .filter((e) => e.status === "active" && e.classes)
    .map((e) => ({ id: e.classes!.id, name: e.classes!.name }));

  const student: StudentDetail = {
    id: p.id,
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    classes,
  };

  const entries: ProgressEntry[] = (progressRes.data ?? []).map((row) => {
    const instructor = row.instructor as unknown as { full_name: string | null } | null;
    return {
      id: row.id as string,
      notes: (row.notes as string | null) ?? null,
      level: (row.level as string | null) ?? null,
      certifications: ((row.certifications as string[] | null) ?? []) as string[],
      loggedAt: row.logged_at as string,
      instructorName: instructor?.full_name ?? null,
    };
  });

  void DAY_SHORT;

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link
          href="/portal/admin/students"
          className="text-xs text-muted hover:text-ink"
        >
          {t("back")}
        </Link>
        <div className="mt-3 flex items-center gap-4">
          <span
            className="grid h-14 w-14 shrink-0 place-items-center rounded-full text-xl font-black text-white"
            style={{ background: "var(--brand)" }}
          >
            {(student.name ?? "?")
              .split(" ")
              .map((w) => w[0])
              .slice(0, 2)
              .join("")
              .toUpperCase()}
          </span>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-ink">
              {student.name ?? tShared("unknownStudent")}
            </h1>
            <p className="text-sm text-muted">
              {student.email ?? student.phone ?? t("noContactOnFile")}
            </p>
            {student.classes.length > 0 && (
              <p className="mt-1 text-xs text-muted">
                {student.classes.map((c) => c.name).join(" · ")}
              </p>
            )}
          </div>
        </div>
      </div>

      <ProgressTracker studentId={student.id} entries={entries} />

      <DeleteStudentButton studentId={student.id} studentName={student.name} />
    </div>
  );
}
