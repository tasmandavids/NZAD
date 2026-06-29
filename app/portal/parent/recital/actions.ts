"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function updateCostumeSize(
  costumeId: string,
  sizeLabel: string,
  sizeNotes: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("student_costumes")
    .update({
      size_label: sizeLabel || null,
      size_notes: sizeNotes || null,
      status: "size_confirmed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", costumeId);

  if (error) throw error;
  revalidatePath("/portal/parent/recital");
}
