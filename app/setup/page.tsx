// app/setup/page.tsx
// Post-onboarding setup wizard. Admins land here after creating their studio
// until setup_completed_at is set (unless snoozed).

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SetupWizard } from "@/components/setup/SetupWizard";
import type { SetupStudio } from "@/app/setup/actions";
import { fetchStudioSetupState } from "@/lib/setup/server";
import type { SetupStepId } from "@/lib/setup/constants";

export default async function SetupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?next=/setup");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) redirect("/onboarding");
  if (profile.role !== "admin") redirect("/portal");

  const { state, error } = await fetchStudioSetupState(supabase, profile.studio_id);

  if (!state) redirect("/onboarding");
  if (state.setupCompletedAt) redirect("/portal/admin");

  const initial: SetupStudio = {
    name: state.name,
    setupPath: state.setupPath,
    importSource: state.importSource,
    initialStep: (state.setupStep ?? "path") as SetupStepId,
    locationCity: state.locationCity,
    locationRegion: state.locationRegion,
    locationCountry: state.locationCountry,
    about: state.about,
    danceStyles: state.danceStyles,
    schemaReady: state.schemaReady,
  };

  return <SetupWizard studio={initial} schemaError={error} />;
}
