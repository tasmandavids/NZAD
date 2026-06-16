// app/onboarding/page.tsx
// Server guard for the wizard. Middleware sends signed-in users WITHOUT a
// studio here; if they already have one, bounce them to the dashboard so the
// wizard is never shown to an existing owner.

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("studio_id")
      .eq("id", user.id)
      .single();
    if (profile?.studio_id) redirect("/portal/admin");
  }

  return <OnboardingWizard signedIn={!!user} email={user?.email ?? ""} />;
}
