"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ComponentProps } from "react";

type SiteNavLinkProps = ComponentProps<typeof Link>;

/** Prefetch on hover/touch — Next.js equivalent of instant.page for App Router. */
export function SiteNavLink({ href, prefetch = true, onMouseEnter, onTouchStart, ...rest }: SiteNavLinkProps) {
  const router = useRouter();

  const warm = useCallback(() => {
    if (!prefetch) return;
    const target = typeof href === "string" ? href : href.pathname ?? null;
    if (target) router.prefetch(target);
  }, [router, href, prefetch]);

  return (
    <Link
      href={href}
      prefetch={prefetch}
      onMouseEnter={(e) => {
        warm();
        onMouseEnter?.(e);
      }}
      onTouchStart={(e) => {
        warm();
        onTouchStart?.(e);
      }}
      {...rest}
    />
  );
}
