// ============================================================================
//  middleware.ts · Phase 2 — role-based portal routing.
//  Runs on almost all routes (see `config.matcher`) to:
//    1. Refresh the Supabase session (or clear stale auth cookies).
//    2. On /portal/**, /platform/**, /login — enforce auth routing.
//  Row-level access is still enforced in Postgres (RLS); this is just routing.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { portalHomeForAccount } from "@/lib/account/memberships";
import type { AccountKind } from "@/lib/account/kinds";
import { checkPlatformOperator } from "@/lib/platform/operator-edge";
import { canAccessPortalPath } from "@/lib/portal/office-access";
import { mergeSessionCookies, redirectWithSession, refreshSession } from "@/lib/supabase/middleware";
import type { Role } from "@/lib/types";

const ROLE_HOME: Record<Role, string> = {
  admin:   "/portal/admin",
  teacher: "/portal/teacher",
  office:  "/portal/office",
  parent:  "/portal/parent",
  student: "/portal/student",
};

export async function middleware(request: NextRequest) {
  const { supabase, response, user: sessionUser } = await refreshSession(request);

  const { pathname } = request.nextUrl;
  const inPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const inPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  const inLogin = pathname === "/login";
  const inJoin = pathname === "/join";

  // Session refresh only — no routing rules on public pages (except join handled below).
  if (!inPortal && !inPlatform && !inLogin && !inJoin) {
    return response;
  }

  const user = sessionUser;

  // Platform console — Olune operators only.
  if (inPlatform) {
    if (!user) {
      return redirectWithSession(request, "/login", response, { next: pathname });
    }
    const isOperator = await checkPlatformOperator(supabase, user.id, user.email);
    if (!isOperator) {
      const profile = await getProfile(supabase, user.id);
      const dest =
        profile?.studioId && profile.role
          ? resolveHome(profile)
          : "/onboarding";
      return mergeSessionCookies(NextResponse.redirect(new URL(dest, request.url)), response);
    }
    return response;
  }

  // Unauthenticated → can't be in a portal.
  if (inPortal && !user) {
    return redirectWithSession(request, "/login", response, { next: pathname });
  }

  if (user) {
    const profile = await getProfile(supabase, user.id);

    // Signed up but hasn't created/joined a studio yet (role defaults to parent).
    if (!profile?.studioId) {
      if (inJoin) return response;
      if (inPortal || inLogin || pathname === "/portal" || pathname === "/portal/") {
        return mergeSessionCookies(
          NextResponse.redirect(new URL("/onboarding", request.url)),
          response,
        );
      }
      return response;
    }

    const home = resolveHome(profile);

    // On /login or bare /portal → send to the intended destination.
    if (pathname === "/login" || pathname === "/portal" || pathname === "/portal/") {
      const dest = await resolveSignedInDestination(
        request,
        supabase,
        user.id,
        user.email,
        home,
        profile,
      );
      return mergeSessionCookies(NextResponse.redirect(new URL(dest, request.url)), response);
    }

    // Wandered into another role's portal → bounce to their own.
    if (inPortal && !canAccessPortalPath(profile.role!, pathname)) {
      return mergeSessionCookies(NextResponse.redirect(new URL(home, request.url)), response);
    }
  }

  return response;
}

function resolveHome(profile: ProfileAccess): string {
  return portalHomeForAccount(profile.accountKind, profile.role!);
}

function isSafeRelativePath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//");
}

async function resolveSignedInDestination(
  request: NextRequest,
  supabase: SupabaseClient,
  userId: string,
  email: string | undefined,
  home: string,
  profile: ProfileAccess,
): Promise<string> {
  const next = request.nextUrl.searchParams.get("next");
  if (!next || !isSafeRelativePath(next)) return home;

  if (next.startsWith("/platform")) {
    const isOperator = await checkPlatformOperator(supabase, userId, email);
    return isOperator ? next : home;
  }

  if (next.startsWith("/portal")) {
    return canAccessPortalPath(profile.role ?? "parent", next) ? next : home;
  }

  return home;
}

/**
 * Source of truth for role = the database (profiles.role).
 *
 * SCALE TIP: this is one indexed PK lookup per request. To remove the DB call
 * entirely, enable the `custom_access_token_hook` in 0002_core_tables_and_rls.sql
 * (Dashboard → Auth → Hooks) and read the claim instead — e.g.:
 *
 *   const { data } = await supabase.auth.getClaims();
 *   const role = data?.claims?.user_role as Role | undefined;
 *
 * Then you can delete getRole() and skip the round-trip.
 */
type ProfileAccess = {
  role: Role;
  studioId: string | null;
  accountKind: AccountKind | null;
};

async function getProfile(
  supabase: SupabaseClient,
  userId: string,
): Promise<ProfileAccess | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role, studio_id, account_kind")
    .eq("id", userId)
    .single();
  if (!data?.role) return null;
  return {
    role: data.role as Role,
    studioId: (data.studio_id as string | null) ?? null,
    accountKind: (data.account_kind as AccountKind | null) ?? null,
  };
}

export const config = {
  // Refresh auth session on all page routes; skip static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
