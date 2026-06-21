import { redirect } from "next/navigation";
import { AffiliationsPanel } from "@/components/portal/teacher/AffiliationsPanel";
import { listMyMemberships } from "@/app/portal/teacher/affiliations/actions";
import { createClient } from "@/lib/supabase/server";

export default async function TeacherAffiliationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const memberships = await listMyMemberships();

  return <AffiliationsPanel memberships={memberships} />;
}
