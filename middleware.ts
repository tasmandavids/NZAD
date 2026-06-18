// ============================================================================
//  middleware.ts · Phase 2 — role-based portal routing.
//  Runs on almost all routes (see `config.matcher`) to:
//    1. Refresh the Supabase session (or clear stale auth cookies).
//    2. On /portal/**, /platform/**, /login — enforce auth routing.
//  Row-level access is still enforced in Postgres (RLS); this is just routing.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkPlatformOperator } from "@/lib/platform/operator-edge";
import { mergeSessionCookies, redirectWithSession, refreshSession } from "@/lib/supabase/middleware";

type Role = "admin" | "teacher" | "parent" | "student";

const ROLE_HOME: Record<Role, string> = {
  admin:   "/portal/admin",
  teacher: "/portal/teacher",
  parent:  "/portal/parent",
  student: "/portal/student",
};

export async function middleware(request: NextRequest) {
  const { supabase, response, user: sessionUser } = await refreshSession(request);

  const { pathname } = request.nextUrl;
  const inPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const inPlatform = pathname === "/platform" || pathname.startsWith("/platform/");
  const inLogin = pathname === "/login";

  // Session refresh only — no routing rules on public pages.
  if (!inPortal && !inPlatform && !inLogin) {
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
      const role = await getRole(supabase, user.id);
      const dest = role ? ROLE_HOME[role] : "/onboarding";
      return mergeSessionCookies(NextResponse.redirect(new URL(dest, request.url)), response);
    }
    return response;
  }

  // Unauthenticated → can't be in a portal.
  if (inPortal && !user) {
    return redirectWithSession(request, "/login", response, { next: pathname });
  }

  if (user) {
    const role = await getRole(supabase, user.id);

    // Signed up but hasn't created/joined a studio yet.
    if (!role) {
      if (inPortal) {
        return mergeSessionCookies(
          NextResponse.redirect(new URL("/onboarding", request.url)),
          response,
        );
      }
      return response;
    }

    const home = ROLE_HOME[role];

    // On /login or bare /portal → send to the intended destination.
    if (pathname === "/login" || pathname === "/portal" || pathname === "/portal/") {
      const dest = await resolveSignedInDestination(
        request,
        supabase,
        user.id,
        user.email,
        home,
      );
      return mergeSessionCookies(NextResponse.redirect(new URL(dest, request.url)), response);
    }

    // Wandered into another role's portal → bounce to their own.
    if (inPortal && !pathname.startsWith(home)) {
      return mergeSessionCookies(NextResponse.redirect(new URL(home, request.url)), response);
    }
  }

  return response;
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
): Promise<string> {
  const next = request.nextUrl.searchParams.get("next");
  if (!next || !isSafeRelativePath(next)) return home;

  if (next.startsWith("/platform")) {
    const isOperator = await checkPlatformOperator(supabase, userId, email);
    return isOperator ? next : home;
  }

  if (next.startsWith("/portal")) {
    return next.startsWith(home) ? next : home;
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
async function getRole(supabase: SupabaseClient, userId: string): Promise<Role | null> {
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as Role) ?? null;
}

export const config = {
  // Refresh auth session on all page routes; skip static assets.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
