// ============================================================================
//  /portal/student/progress — Student view of own progress & certificates.
// ============================================================================

import { notFound } from "next/navigation";
import { getTranslations } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import StudentProgressPanel from "@/components/portal/shared/StudentProgressPanel";
import { fetchStudentProgressBundle } from "@/lib/portal/student-progress-data";

export default async function StudentProgressPage() {
  const supabase = await createClient();
  const t = await getTranslations("portal.progress");
  const tStudent = await getTranslations("student.progress");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const bundle = await fetchStudentProgressBundle(supabase, user.id);
  if (!bundle) notFound();

  return (
    <StudentProgressPanel
      bundle={bundle}
      backHref="/portal/student"
      labels={{
        back: tStudent("back"),
        unnamedStudent: tStudent("unnamedStudent"),
        currentLevel: t("currentLevel"),
        emptyProgress: tStudent("emptyProgress"),
      }}
    />
  );
}
