"use client";

// Platform console shell — Olune staff navigation on the apex domain.

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/app/portal/actions";
import { OluneMark } from "@/components/brand/OluneLogo";
import { PoweredByOlune } from "@/components/brand/PoweredByOlune";
import { LanguageSwitcher } from "@/components/i18n/LanguageSwitcher";
import { PLATFORM_NAV } from "@/lib/portal/nav-config";

function Sidebar({
  operatorName,
  pathname,
  onNavClick,
}: {
  operatorName: string | null;
  pathname: string;
  onNavClick?: () => void;
}) {
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const tPlatform = useTranslations("nav.platform");

  const isActive = (href: string, exact?: boolean) =>
    exact ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[--hair] p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <OluneMark className="h-8 w-8 shrink-0" />
          <div>
            <h2 className="text-sm font-black text-ink">{tPlatform("consoleTitle")}</h2>
            <p className="text-[0.62rem] uppercase tracking-widest text-muted">
              {tPlatform("consoleSubtitle")}
            </p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 p-3">
        {PLATFORM_NAV.map((item) => {
          const active = isActive(item.href, item.exact);
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              scroll={false}
              onClick={onNavClick}
              className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                active ? "bg-brand text-white" : "text-muted hover:text-ink"
              }`}
            >
              {t(item.labelKey as Parameters<typeof t>[0])}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-[--hair] p-4">
        <PoweredByOlune className="mb-3" />
        <LanguageSwitcher className="mb-3 w-full justify-between" />
        <p className="mb-2 truncate text-xs font-medium text-ink">
          {operatorName ?? tCommon("operator")}
        </p>
        <form action={signOut}>
          <button type="submit" className="text-xs text-muted transition-colors hover:text-ink">
            {tCommon("signOut")}
          </button>
        </form>
      </div>
    </div>
  );
}

export function PlatformShell({
  operatorName,
  children,
}: {
  operatorName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const tPlatform = useTranslations("nav.platform");
  const tShell = useTranslations("shell");
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      <aside className="hidden w-60 shrink-0 border-r border-[--hair] bg-surface md:block">
        <Sidebar operatorName={operatorName} pathname={pathname} />
      </aside>

      <div className="fixed inset-x-0 top-0 z-50 md:hidden">
        <div className="flex items-center justify-between border-b border-[--hair] bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <OluneMark className="h-7 w-7 shrink-0" />
            <span className="text-sm font-black text-ink">{tPlatform("consoleTitle")}</span>
          </div>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center text-muted"
            aria-label={tShell("toggleMenu")}
          >
            {mobileOpen ? "✕" : "☰"}
          </button>
        </div>
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-[--hair] bg-surface"
            >
              <Sidebar
                operatorName={operatorName}
                pathname={pathname}
                onNavClick={() => setMobileOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <main className="flex-1 overflow-auto pt-[53px] md:pt-0">{children}</main>
    </div>
  );
}
