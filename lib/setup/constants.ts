export const DANCE_STYLES = [
  "Ballet",
  "Jazz",
  "Hip-Hop",
  "Contemporary",
  "Tap",
  "Lyrical",
  "Acro",
  "Pointe",
  "Musical Theatre",
  "Ballroom",
  "Latin",
  "Aerial",
  "Preschool / Tiny Tots",
  "Adult Open",
  "Competition Team",
] as const;

export type SetupPath = "scratch" | "import";

export type ImportSource =
  | "studiopro"
  | "classmanager"
  | "jackrabbit"
  | "dancestudio-pro"
  | "spreadsheet"
  | "other";

export const IMPORT_SOURCES: {
  id: ImportSource;
  name: string;
  hint: string;
  sampleHeaders: string[];
}[] = [
  {
    id: "studiopro",
    name: "StudioPro",
    hint: "Export your student list from Reports → Students → Export CSV.",
    sampleHeaders: ["First Name", "Last Name", "Email", "Phone", "Parent Name", "Parent Email"],
  },
  {
    id: "classmanager",
    name: "Class Manager",
    hint: "Download your roster from Settings → Data export.",
    sampleHeaders: ["Student", "Email", "Mobile", "Guardian", "Guardian Email", "Class"],
  },
  {
    id: "jackrabbit",
    name: "Jackrabbit Dance",
    hint: "Use Families → Export, or copy directly from your class roster grid.",
    sampleHeaders: ["Student Name", "Student Email", "Family Email", "Phone", "Classes"],
  },
  {
    id: "dancestudio-pro",
    name: "DanceStudio-Pro",
    hint: "Export students from the Students tab, or paste from your spreadsheet.",
    sampleHeaders: ["Name", "Email", "Phone", "Parent", "Parent Email"],
  },
  {
    id: "spreadsheet",
    name: "Spreadsheet",
    hint: "Copy rows from Excel or Google Sheets — we'll detect columns automatically.",
    sampleHeaders: ["Name", "Email", "Phone"],
  },
  {
    id: "other",
    name: "Another system",
    hint: "Paste any export — we'll try to match name, email, and phone columns.",
    sampleHeaders: ["Name", "Email", "Phone"],
  },
];

export const SETUP_STEPS = [
  { id: "path", label: "Get started" },
  { id: "profile", label: "Your studio" },
  { id: "students", label: "Dancers" },
  { id: "classes", label: "Classes" },
  { id: "tour", label: "Tour" },
] as const;

export type SetupStepId = (typeof SETUP_STEPS)[number]["id"];

export const TOUR_FEATURES = [
  {
    href: "/portal/admin",
    emoji: "📊",
    title: "Dashboard",
    body: "See enrolments, revenue, and today's schedule at a glance.",
  },
  {
    href: "/portal/admin/classes",
    emoji: "🩰",
    title: "Classes",
    body: "Build your timetable, set capacity, and manage waitlists.",
  },
  {
    href: "/portal/admin/students",
    emoji: "👨‍👩‍👧",
    title: "Students & families",
    body: "Roster, enrolments, progress notes, and parent accounts.",
  },
  {
    href: "/portal/admin/billing",
    emoji: "💳",
    title: "Billing",
    body: "Invoices, Stripe payments, and term fees in NZD.",
  },
  {
    href: "/portal/admin/site",
    emoji: "🌐",
    title: "Website",
    body: "Your public site — classes, enrolments, and your brand.",
  },
  {
    href: "/portal/admin/leads",
    emoji: "✉️",
    title: "Leads & messages",
    body: "Trial enquiries and two-way messaging with families.",
  },
] as const;

export const NZ_REGIONS = [
  "Northland",
  "Auckland",
  "Waikato",
  "Bay of Plenty",
  "Gisborne",
  "Hawke's Bay",
  "Taranaki",
  "Manawatū-Whanganui",
  "Wellington",
  "Tasman",
  "Nelson",
  "Marlborough",
  "West Coast",
  "Canterbury",
  "Otago",
  "Southland",
] as const;
