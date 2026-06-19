/**
 * Adds useTranslations import + hook and replaces top-level UI strings
 * in admin components that haven't been migrated yet.
 */
import fs from "fs";
import path from "path";

const root = path.resolve(import.meta.dirname, "..");

const files = [
  { file: "components/admin/parents/ParentsManager.tsx", ns: "admin.parents" },
  { file: "components/admin/students/StudentsManager.tsx", ns: "admin.students" },
  { file: "components/admin/students/ProgressTracker.tsx", ns: "admin.students.progress" },
  { file: "components/admin/leads/LeadsBoard.tsx", ns: "admin.leads" },
  { file: "components/admin/subscriptions/SubscriptionsManager.tsx", ns: "admin.subscriptions" },
];

const commonImport = `import { useTranslations } from "next-intl";\n`;

for (const { file, ns } of files) {
  const fp = path.join(root, file);
  let src = fs.readFileSync(fp, "utf8");
  if (src.includes("useTranslations")) {
    console.log("skip (already migrated):", file);
    continue;
  }

  // insert import after "use client" block
  if (src.startsWith('"use client"')) {
    const idx = src.indexOf("\n\n");
    src = src.slice(0, idx + 1) + commonImport + src.slice(idx + 1);
  } else {
    src = commonImport + src;
  }

  // add hooks to default export function
  const exportMatch = src.match(/export default function (\w+)\([^)]*\)\s*\{/);
  if (exportMatch) {
    const fn = exportMatch[0];
    const hooks = `${fn}\n  const t = useTranslations("${ns}");\n  const tShared = useTranslations("admin.shared");\n  const tCommon = useTranslations("common");`;
    src = src.replace(fn, hooks);
  }

  fs.writeFileSync(fp, src);
  console.log("patched hooks:", file);
}
