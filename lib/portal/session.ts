import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { mapMembershipRow, type MembershipRow } from "@/lib/account/memberships";
import { resolveEffectiveStudioId } from "@/lib/portal/access";
import type { AccountKind } from "@/lib/account/kinds";
import type { Role, StudioMembershipSummary } from "@/lib/types";

export type PortalSession = {
  supabase: Awaited<ReturnType<typeof createClient>>;
  userId: string;
  studioId: string;
  role: Role;
  accountKind: AccountKind | null;
  activeStudioId: string;
  memberships: StudioMembershipSummary[];
};

/** Request-scoped portal auth context shared by layout and pages. */
export const getPortalSession = cache(async (): Promise<PortalSession | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role, account_kind, active_studio_id")
    .eq("id", user.id)
    .single();

  if (!profile?.studio_id) return null;

  const { data: membershipRows } = await supabase
    .from("studio_memberships")
    .select(`
      id, studio_id, role, status, is_primary, linked_via, linked_at,
      studios ( name, slug, kind )
    `)
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false });

  const memberships = (membershipRows ?? []).map((row) => {
    const mapped = mapMembershipRow(row as unknown as MembershipRow);
    return {
      id: mapped.id,
      studioId: mapped.studioId,
      studioName: mapped.studioName,
      studioSlug: mapped.studioSlug,
      studioKind: mapped.studioKind as StudioMembershipSummary["studioKind"],
      role: mapped.role,
      status: mapped.status,
      isPrimary: mapped.isPrimary,
    };
  });

  const studioId = resolveEffectiveStudioId(profile);
  if (!studioId) return null;

  return {
    supabase,
    userId: user.id,
    studioId,
    role: profile.role as Role,
    accountKind: (profile.account_kind as AccountKind | null) ?? null,
    activeStudioId: studioId,
    memberships,
  };
});

export async function requirePortalSession(): Promise<PortalSession> {
  const session = await getPortalSession();
  if (!session) throw new Error("Not signed in or no studio.");
  return session;
}
