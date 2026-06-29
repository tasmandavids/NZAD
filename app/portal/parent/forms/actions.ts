"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitForm(
  formId: string,
  studentId: string,
  data: Record<string, unknown>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) throw new Error("No studio");

  const now = new Date().toISOString();

  const { error } = await supabase
    .from("form_responses")
    .upsert(
      {
        form_id: formId,
        student_id: studentId,
        parent_id: user.id,
        studio_id: profile.studio_id,
        data,
        signed_at: now,
        updated_at: now,
      },
      { onConflict: "form_id,student_id" }
    );

  if (error) throw error;
  revalidatePath("/portal/parent/forms");
}
