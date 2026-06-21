"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { mapMembershipRow, type MembershipRow } from "@/lib/account/memberships";
import type { StudioMembership } from "@/lib/account/memberships";

const TokenSchema = z.object({
  token: z.string().min(8),
});

export type AffiliationResult =
  | { ok: true; studioId: string }
  | { ok: false; error: string };

export async function listMyMemberships(): Promise<StudioMembership[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("studio_memberships")
    .select(`
      id, studio_id, role, status, is_primary, linked_via, linked_at,
      studios ( name, slug, kind )
    `)
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("linked_at", { ascending: true });

  return (data ?? []).map((row) => mapMembershipRow(row as unknown as MembershipRow));
}

export async function acceptInviteToken(input: unknown): Promise<AffiliationResult> {
  const parsed = TokenSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid token" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Not signed in." };

  const { data: studioId, error } = await supabase.rpc("accept_studio_invite", {
    p_token: parsed.data.token.trim(),
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/teacher");
  revalidatePath("/portal/teacher/affiliations");

  return { ok: true, studioId: studioId as string };
}
