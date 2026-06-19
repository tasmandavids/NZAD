import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  labelKey: string;
  exact?: boolean;
};

export type NavSection = {
  titleKey?: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { href: "/portal/admin", labelKey: "nav.admin.dashboard", exact: true },
      { href: "/portal/admin/classes", labelKey: "nav.admin.classes" },
      { href: "/portal/admin/events", labelKey: "nav.admin.events" },
    ],
  },
  {
    titleKey: "nav.sections.clientManagement",
    items: [
      { href: "/portal/admin/parents", labelKey: "nav.admin.parents" },
      { href: "/portal/admin/students", labelKey: "nav.admin.students" },
      { href: "/portal/admin/leads", labelKey: "nav.admin.leads" },
    ],
  },
  {
    titleKey: "nav.sections.finance",
    items: [
      { href: "/portal/admin/billing", labelKey: "nav.admin.billing" },
      { href: "/portal/admin/accounting", labelKey: "nav.admin.accounting" },
      { href: "/portal/admin/subscriptions", labelKey: "nav.admin.subscriptions" },
    ],
  },
  {
    titleKey: "nav.sections.digital",
    items: [
      { href: "/portal/admin/site", labelKey: "nav.admin.website" },
      { href: "/portal/admin/advertising", labelKey: "nav.admin.advertising" },
      { href: "/portal/admin/shop", labelKey: "nav.admin.shop" },
    ],
  },
  {
    titleKey: "nav.sections.communications",
    items: [
      { href: "/portal/admin/email", labelKey: "nav.admin.email" },
      { href: "/portal/admin/messages", labelKey: "nav.admin.messages" },
      { href: "/portal/admin/support", labelKey: "nav.admin.support" },
    ],
  },
  {
    items: [{ href: "/portal/admin/settings", labelKey: "nav.admin.settings" }],
  },
];

export const PORTAL_NAV: Record<Exclude<Role, "admin">, NavItem[]> = {
  teacher: [{ href: "/portal/teacher", labelKey: "nav.teacher.schedule", exact: true }],
  parent: [
    { href: "/portal/parent", labelKey: "nav.parent.familyHub", exact: true },
    { href: "/portal/parent/messages", labelKey: "nav.parent.studioEmail" },
  ],
  student: [{ href: "/portal/student", labelKey: "nav.student.timetable", exact: true }],
};

export const ROLE_BADGE_KEYS: Record<Role, string> = {
  admin: "roles.admin",
  teacher: "roles.teacher",
  parent: "roles.parent",
  student: "roles.student",
};

export const PLATFORM_NAV: NavItem[] = [
  { href: "/platform", labelKey: "nav.platform.overview", exact: true },
  { href: "/platform/studios", labelKey: "nav.platform.studios" },
  { href: "/platform/owners", labelKey: "nav.platform.owners" },
  { href: "/platform/messages", labelKey: "nav.platform.supportInbox" },
  { href: "/platform/tasks", labelKey: "nav.platform.opsTasks" },
  { href: "/platform/features", labelKey: "nav.platform.featureFlags" },
  { href: "/platform/announcements", labelKey: "nav.platform.announcements" },
  { href: "/platform/settings", labelKey: "nav.platform.settings" },
  { href: "/platform/audit", labelKey: "nav.platform.auditLog" },
];
