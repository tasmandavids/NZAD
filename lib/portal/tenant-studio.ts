import type { SupabaseClient } from "@supabase/supabase-js";
import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";
import { isStudioOpsRole, resolveEffectiveStudioId } from "@/lib/portal/access";
import type { Role } from "@/lib/types";

/** Whether the user may manage (admin/office) the given studio. */
export async function userHasOpsAccessToStudio(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    studio_id: string | null;
    active_studio_id?: string | null;
    role?: Role | null;
  },
  studioId: string,
): Promise<boolean> {
  const homeStudioId = resolveEffectiveStudioId(profile);
  if (isStudioOpsRole(profile.role) && homeStudioId === studioId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("studio_memberships")
    .select("role")
    .eq("user_id", userId)
    .eq("studio_id", studioId)
    .eq("status", "active")
    .maybeSingle();

  return !!membership && isStudioOpsRole(membership.role as Role);
}

/** Whether the user belongs to the studio (home profile or active membership). */
export async function userBelongsToStudio(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    studio_id: string | null;
    active_studio_id?: string | null;
  },
  studioId: string,
): Promise<boolean> {
  const homeStudioId = resolveEffectiveStudioId(profile);
  if (homeStudioId === studioId || profile.studio_id === studioId) {
    return true;
  }

  const { data: membership } = await supabase
    .from("studio_memberships")
    .select("id")
    .eq("user_id", userId)
    .eq("studio_id", studioId)
    .eq("status", "active")
    .maybeSingle();

  return !!membership;
}

/**
 * Resolve the studio scope for the current request.
 * On a tenant host (subdomain / custom domain), queries are pinned to that studio.
 * On the platform root, falls back to the user's active workspace.
 */
export async function resolveTenantStudioId(
  supabase: SupabaseClient,
  userId: string,
  profile: {
    studio_id: string | null;
    active_studio_id?: string | null;
    role?: Role | null;
  },
  options?: { requireOpsAccess?: boolean },
): Promise<{ studioId: string | null; error: string | null }> {
  const host = (await headers()).get("host");
  const tenant = await resolveStudio(host);
  const profileStudioId = resolveEffectiveStudioId(profile);

  if (!tenant) {
    return {
      studioId: profileStudioId,
      error: profileStudioId ? null : "No studio found.",
    };
  }

  const belongs = await userBelongsToStudio(supabase, userId, profile, tenant.id);
  if (!belongs) {
    return {
      studioId: null,
      error: "You don't have access to this studio.",
    };
  }

  if (options?.requireOpsAccess) {
    const hasOps = await userHasOpsAccessToStudio(supabase, userId, profile, tenant.id);
    if (!hasOps) {
      return {
        studioId: null,
        error: "You don't have access to manage this studio.",
      };
    }
  }

  return { studioId: tenant.id, error: null };
}
