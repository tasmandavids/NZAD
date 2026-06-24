import type { SupabaseClient } from "@supabase/supabase-js";
import type { ProgressEntry } from "@/components/admin/students/ProgressTracker";

export type StudentClassSummary = {
  id: string;
  name: string;
  level: string | null;
};

export type AttendanceRecord = {
  id: string;
  date: string;
  status: "present" | "absent" | "late" | "excused";
  className: string;
};

export type CertificateItem = {
  title: string;
  progressId: string;
  awardedAt: string;
  instructorName: string | null;
};

export type StudentProgressBundle = {
  studentId: string;
  studentName: string | null;
  classes: StudentClassSummary[];
  entries: ProgressEntry[];
  attendance: AttendanceRecord[];
  certificates: CertificateItem[];
  latestLevel: string | null;
};

function mapProgressRows(
  rows: {
    id: unknown;
    notes: unknown;
    level: unknown;
    certifications: unknown;
    logged_at: unknown;
    instructor: unknown;
  }[],
): ProgressEntry[] {
  return rows.map((row) => {
    const instructor = row.instructor as { full_name: string | null } | null;
    return {
      id: row.id as string,
      notes: (row.notes as string | null) ?? null,
      level: (row.level as string | null) ?? null,
      certifications: ((row.certifications as string[] | null) ?? []) as string[],
      loggedAt: row.logged_at as string,
      instructorName: instructor?.full_name ?? null,
    };
  });
}

function flattenCertificates(entries: ProgressEntry[]): CertificateItem[] {
  const seen = new Set<string>();
  const items: CertificateItem[] = [];

  for (const entry of entries) {
    for (const title of entry.certifications) {
      const key = `${entry.id}:${title}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        title,
        progressId: entry.id,
        awardedAt: entry.loggedAt,
        instructorName: entry.instructorName,
      });
    }
  }

  return items;
}

export async function fetchStudentProgressBundle(
  supabase: SupabaseClient,
  studentId: string,
  attendanceLimit = 60,
): Promise<StudentProgressBundle | null> {
  const [studentRes, progressRes, attendanceRes] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        `
        id, full_name,
        enrollments!student_id (
          status,
          classes ( id, name, level )
        )
      `,
      )
      .eq("id", studentId)
      .single(),

    supabase
      .from("student_progress")
      .select(
        `
        id, notes, level, certifications, logged_at,
        instructor:profiles!instructor_id ( full_name )
      `,
      )
      .eq("student_id", studentId)
      .order("logged_at", { ascending: false }),

    supabase
      .from("attendance")
      .select(
        `
        id, date, status,
        classes ( name )
      `,
      )
      .eq("student_id", studentId)
      .order("date", { ascending: false })
      .limit(attendanceLimit),
  ]);

  if (studentRes.error || !studentRes.data) return null;

  const student = studentRes.data;
  const classes = (
    (student.enrollments as unknown as {
      status: string;
      classes: StudentClassSummary | null;
    }[]) ?? []
  )
    .filter((e) => e.status === "active" && e.classes)
    .map((e) => e.classes!);

  const entries = mapProgressRows(progressRes.data ?? []);
  const attendance: AttendanceRecord[] = (attendanceRes.data ?? [])
    .map((row) => {
      const cls = row.classes as unknown as { name: string } | null;
      if (!cls) return null;
      return {
        id: row.id as string,
        date: row.date as string,
        status: row.status as AttendanceRecord["status"],
        className: cls.name,
      };
    })
    .filter((r): r is AttendanceRecord => r !== null);

  return {
    studentId: student.id as string,
    studentName: (student.full_name as string | null) ?? null,
    classes,
    entries,
    attendance,
    certificates: flattenCertificates(entries),
    latestLevel: entries.find((e) => e.level)?.level ?? null,
  };
}
