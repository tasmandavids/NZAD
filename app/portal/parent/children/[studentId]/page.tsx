// ============================================================================
//  /portal/parent/children/[studentId] — Parent view of a child's progress.
// ============================================================================

import { notFound } from "next/navigation";
import { getTranslations } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import StudentProgressPanel from "@/components/portal/shared/StudentProgressPanel";
import { fetchStudentProgressBundle } from "@/lib/portal/student-progress-data";

export default async function ParentChildProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const supabase = await createClient();
  const t = await getTranslations("portal.progress");
  const tParent = await getTranslations("parent.childProgress");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: guardianship } = await supabase
    .from("guardianships")
    .select("id")
    .eq("guardian_id", user.id)
    .eq("student_id", studentId)
    .maybeSingle();

  if (!guardianship) notFound();

  const bundle = await fetchStudentProgressBundle(supabase, studentId);
  if (!bundle) notFound();

  return (
    <StudentProgressPanel
      bundle={bundle}
      backHref="/portal/parent"
      labels={{
        back: tParent("back"),
        unnamedStudent: tParent("unnamedDancer"),
        currentLevel: t("currentLevel"),
        emptyProgress: tParent("emptyProgress"),
      }}
    />
  );
}
