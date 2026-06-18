// ============================================================================
//  app/not-found.tsx — friendly 404 for public site routes on the root domain.
// ============================================================================

import Link from "next/link";
import { headers } from "next/headers";
import { resolveStudio } from "@/lib/tenant";

export default async function NotFound() {
  const host = (await headers()).get("host");
  const studio = await resolveStudio(host);
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN ?? "localhost";

  return (
    <div className="grid min-h-screen place-items-center bg-base px-6 text-ink">
      <div className="max-w-md text-center">
        <p className="text-sm font-semibold uppercase tracking-widest text-brand">404</p>
        <h1 className="mt-2 text-2xl font-bold">Page not found</h1>
        {!studio ? (
          <>
            <p className="mt-3 text-sm text-muted">
              On <strong className="text-ink">localhost</strong> this URL is the Olune platform — not a
              studio website. Your public pages live on your studio subdomain.
            </p>
            <p className="mt-4 rounded-xl border border-[--hair] bg-surface px-4 py-3 text-left text-sm text-muted">
              Example:{" "}
              <code className="text-ink">https://your-slug.{root}:3000/about</code>
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/" className="btn-glow btn-glow--solid px-5 py-2 text-sm">
                Olune home
              </Link>
              <Link href="/login" className="rounded-full border border-[--hair] px-5 py-2 text-sm text-ink">
                Sign in
              </Link>
              <Link href="/portal/admin/site" className="rounded-full border border-[--hair] px-5 py-2 text-sm text-ink">
                Website admin
              </Link>
            </div>
          </>
        ) : (
          <>
            <p className="mt-3 text-sm text-muted">
              This page hasn&apos;t been published yet, or the URL is wrong. Check spelling and publish status
              in the admin Website tab.
            </p>
            <Link href="/" className="btn-glow btn-glow--solid mt-6 inline-flex px-5 py-2 text-sm">
              Back to home
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
