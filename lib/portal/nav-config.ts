import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  exact?: boolean;
};

export type NavSection = {
  title?: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavSection[] = [
  {
    items: [
      { href: "/portal/admin", label: "Dashboard", exact: true },
      { href: "/portal/admin/classes", label: "Classes" },
      { href: "/portal/admin/events", label: "Events" },
    ],
  },
  {
    title: "Client management",
    items: [
      { href: "/portal/admin/parents", label: "Parents" },
      { href: "/portal/admin/students", label: "Students" },
      { href: "/portal/admin/leads", label: "Leads" },
    ],
  },
  {
    title: "Finance",
    items: [
      { href: "/portal/admin/billing", label: "Billing" },
      { href: "/portal/admin/accounting", label: "Accounting" },
      { href: "/portal/admin/subscriptions", label: "Subscriptions" },
    ],
  },
  {
    title: "Digital",
    items: [
      { href: "/portal/admin/site", label: "Website" },
      { href: "/portal/admin/advertising", label: "Advertising" },
      { href: "/portal/admin/shop", label: "Shop" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/portal/admin/email", label: "Email" },
      { href: "/portal/admin/messages", label: "Messages" },
      { href: "/portal/admin/support", label: "Olune Support" },
    ],
  },
  {
    items: [{ href: "/portal/admin/settings", label: "Settings" }],
  },
];

export const PORTAL_NAV: Record<Exclude<Role, "admin">, NavItem[]> = {
  teacher: [{ href: "/portal/teacher", label: "Schedule & Roll", exact: true }],
  parent: [
    { href: "/portal/parent", label: "Family Hub", exact: true },
    { href: "/portal/parent/messages", label: "Studio email" },
  ],
  student: [{ href: "/portal/student", label: "My Timetable", exact: true }],
};

export const ROLE_BADGE: Record<Role, string> = {
  admin: "Studio admin",
  teacher: "Teacher",
  parent: "Parent",
  student: "Student",
};
