// ============================================================================
//  middleware.ts · Phase 2 — role-based portal routing.
//  Runs on /portal/** and /login (see `config.matcher`).
//    1. Refreshes the Supabase session.
//    2. No session + portal route        → kick to /login?next=…
//    3. Signed in, no studio yet          → /onboarding
//    4. Signed in + wrong portal segment  → bounce to THEIR /portal/<role>
//    5. Signed in + on /login or /portal  → forward to THEIR /portal/<role>
//  Row-level access is still enforced in Postgres (RLS); this is just routing.
// ============================================================================

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkPlatformOperator } from "@/lib/platform/operator-edge";

type Role = "admin" | "teacher" | "parent" | "student";

const ROLE_HOME: Record<Role, string> = {
  admin:   "/portal/admin",
  teacher: "/portal/teacher",
  parent:  "/portal/parent",
  student: "/portal/student",
};

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() (not getSession()) — it revalidates the token against Supabase.
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const inPortal = pathname === "/portal" || pathname.startsWith("/portal/");
  const inPlatform = pathname === "/platform" || pathname.startsWith("/platform/");

  // Platform console — Olune operators only.
  if (inPlatform) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    const isOperator = await checkPlatformOperator(supabase, user.id, user.email);
    if (!isOperator) {
      const role = await getRole(supabase, user.id);
      const dest = role ? ROLE_HOME[role] : "/onboarding";
      return NextResponse.redirect(new URL(dest, request.url));
    }
    return response;
  }

  // (2) Unauthenticated → can't be in a portal.
  if (inPortal && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (user) {
    const role = await getRole(supabase, user.id);

    // (3) Signed up but hasn't created/joined a studio yet.
    if (!role) {
      if (inPortal) return NextResponse.redirect(new URL("/onboarding", request.url));
      return response;
    }

    const home = ROLE_HOME[role];

    // (5) On /login or bare /portal → forward to role home (honour ?next= for platform).
    if (pathname === "/login" || pathname === "/portal" || pathname === "/portal/") {
      const next = request.nextUrl.searchParams.get("next");
      if (next?.startsWith("/platform") && (await checkPlatformOperator(supabase, user.id, user.email))) {
        return NextResponse.redirect(new URL(next, request.url));
      }
      return NextResponse.redirect(new URL(home, request.url));
    }

    // (4) Wandered into another role's portal → bounce to their own.
    if (inPortal && !pathname.startsWith(home)) {
      return NextResponse.redirect(new URL(home, request.url));
    }
  }

  return response;
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
  // Only run where routing decisions are needed.
  matcher: ["/portal/:path*", "/platform/:path*", "/login"],
};
