"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function markNotificationRead(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("parent_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .eq("parent_id", user.id);

  revalidatePath("/portal/parent/notifications");
}

export async function markAllNotificationsRead() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  await supabase
    .from("parent_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("parent_id", user.id)
    .is("read_at", null);

  revalidatePath("/portal/parent/notifications");
}
