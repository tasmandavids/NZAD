// ============================================================================
//  /portal/teacher/students/[id] — Teacher view of a student's progress.
//  RLS (0011_student_progress.sql) restricts reads/writes to students the
//  signed-in teacher actually teaches, so no extra guard is needed here.
//  Reuses the shared ProgressTracker; delete is hidden for teachers.
// ============================================================================

import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ProgressTracker, {
  type ProgressEntry,
} from "@/components/admin/students/ProgressTracker";

export default async function TeacherStudentProgressPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [studentRes, progressRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email")
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

  return (
    <div className="mx-auto max-w-3xl space-y-8 p-6">
      <div>
        <Link href="/portal/teacher" className="text-xs text-muted hover:text-ink">
          ← Back to schedule
        </Link>
        <h1 className="mt-3 text-2xl font-black tracking-tight text-ink">
          {p.full_name ?? "Student"}
        </h1>
        <p className="text-sm text-muted">{p.email ?? "Progress log"}</p>
      </div>

      <ProgressTracker studentId={p.id} entries={entries} readOnlyDelete />
    </div>
  );
}
