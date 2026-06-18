"use client";

// ============================================================================
//  PortalShell — the shared chrome that wraps every /portal/* route.
//  Renders a collapsible sidebar on desktop and a slide-down drawer on mobile.
//  Nav items are role-aware; active item tracks the pathname.
//  Sign-out calls the portal server action (triggers a full session clear).
// ============================================================================

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { signOut } from "@/app/portal/actions";
import type { Role } from "@/lib/types";
import { NotificationBell } from "@/components/admin/notifications/NotificationBell";

interface NavItem {
  href: string;
  label: string;
  /** Use exact matching — prevents /portal/admin matching /portal/admin/branding */
  exact?: boolean;
}

const NAV: Record<Role, NavItem[]> = {
  admin: [
    { href: "/portal/admin",           label: "Dashboard",  exact: true },
    { href: "/portal/admin/classes",   label: "Classes" },
    { href: "/portal/admin/students",  label: "Students" },
    { href: "/portal/admin/billing",   label: "Billing" },
    { href: "/portal/admin/subscriptions", label: "Subscriptions" },
    { href: "/portal/admin/leads",     label: "Leads" },
    { href: "/portal/admin/messages",  label: "Messages" },
    { href: "/portal/admin/events",    label: "Events" },
    { href: "/portal/admin/shop",      label: "Shop" },
    { href: "/portal/admin/site",      label: "Website" },
    { href: "/portal/admin/support",   label: "Olune support" },
    { href: "/portal/admin/settings",  label: "Settings" },
  ],
  teacher: [
    { href: "/portal/teacher", label: "Schedule & Roll", exact: true },
  ],
  parent: [
    { href: "/portal/parent", label: "Family Hub", exact: true },
  ],
  student: [
    { href: "/portal/student", label: "My Timetable", exact: true },
  ],
};

const ROLE_BADGE: Record<Role, string> = {
  admin:   "Studio admin",
  teacher: "Teacher",
  parent:  "Parent",
  student: "Student",
};

// ── Sidebar nav content (shared between desktop and mobile drawer) ──────────
function SidebarContent({
  role,
  studioName,
  userName,
  pathname,
  onNavClick,
}: {
  role: Role;
  studioName: string;
  userName: string | null;
  pathname: string;
  onNavClick?: () => void;
}) {
  const items = NAV[role];

  const isActive = (item: NavItem) =>
    item.exact
      ? pathname === item.href
      : pathname === item.href || pathname.startsWith(item.href + "/");

  return (
    <div className="flex h-full flex-col">
      {/* Studio brand header */}
      <div className="border-b border-[--hair] p-5">
        <div className="mb-1 flex items-center gap-2.5">
          <span
            className="grid h-8 w-8 shrink-0 place-items-center border text-xs font-black text-ink"
            style={{ borderColor: "var(--brand)" }}
          >
            {studioName[0]?.toUpperCase() ?? "S"}
          </span>
          <h2 className="truncate text-sm font-black text-ink">{studioName}</h2>
        </div>
        <p className="text-[0.62rem] uppercase tracking-widest text-muted">
          {ROLE_BADGE[role]}
        </p>
      </div>

      {/* Nav items */}
      <nav className="flex-1 space-y-0.5 p-3">
        {items.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={`flex items-center rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                active
                  ? "bg-brand text-white"
                  : "text-muted hover:text-ink"
              }`}
              style={
                active
                  ? undefined
                  : {
                      // subtle hover bg using CSS var (Tailwind can't do runtime vars inline)
                    }
              }
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User + sign out */}
      <div className="border-t border-[--hair] p-4">
        <p className="mb-2.5 truncate text-xs font-medium text-ink">
          {userName ?? "You"}
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="text-xs text-muted transition-colors hover:text-ink"
          >
            Sign out →
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Main shell ───────────────────────────────────────────────────────────────
export function PortalShell({
  role,
  studioName,
  userName,
  children,
}: {
  role: Role;
  studioName: string;
  userName: string | null;
  children: React.ReactNode;
}) {
  const pathname  = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const showBell  = role === "admin";

  return (
    <div className="flex h-screen overflow-hidden bg-base">
      {/* ── Desktop sidebar ──────────────────────────────────────────── */}
      <aside className="hidden w-56 shrink-0 border-r border-[--hair] bg-surface md:block">
        <SidebarContent
          role={role}
          studioName={studioName}
          userName={userName}
          pathname={pathname ?? ""}
        />
      </aside>

      {/* ── Mobile: top bar + collapsible drawer ─────────────────────── */}
      <div className="fixed inset-x-0 top-0 z-50 md:hidden">
        <div className="flex items-center justify-between border-b border-[--hair] bg-surface/95 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2">
            <span
              className="grid h-7 w-7 place-items-center border text-xs font-black text-ink"
              style={{ borderColor: "var(--brand)" }}
            >
              {studioName[0]?.toUpperCase() ?? "S"}
            </span>
            <span className="text-sm font-black text-ink">{studioName}</span>
          </div>
          <button
            onClick={() => setMobileOpen((o) => !o)}
            className="grid h-8 w-8 place-items-center text-muted transition-colors hover:text-ink"
            aria-label="Toggle menu"
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
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden border-b border-[--hair] bg-surface shadow-2xl"
            >
              <SidebarContent
                role={role}
                studioName={studioName}
                userName={userName}
                pathname={pathname ?? ""}
                onNavClick={() => setMobileOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Main content ─────────────────────────────────────────────── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar with notification bell (admin only) */}
        {showBell && (
          <div className="flex items-center justify-end border-b border-[--hair] bg-surface px-5 py-2">
            <NotificationBell />
          </div>
        )}
        <main className={`flex-1 overflow-auto ${showBell ? "" : "md:pt-0 pt-[53px]"}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
