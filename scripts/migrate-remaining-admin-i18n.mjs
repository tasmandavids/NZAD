#!/usr/bin/env node
/**
 * Migrates remaining admin components to next-intl useTranslations("admin").
 * Run: node scripts/migrate-remaining-admin-i18n.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.resolve(import.meta.dirname, "..");

function ensureImport(content) {
  if (content.includes('from "next-intl"')) return content;
  return content.replace(
    /"use client";\n/,
    '"use client";\nimport { useTranslations } from "next-intl";\n\n',
  );
}

function addHookAfterBrace(content, fnPattern, hookLines) {
  const re = new RegExp(`(${fnPattern}\\s*\\([^)]*\\)\\s*\\{)`, "m");
  const m = content.match(re);
  if (!m) return content;
  const insertAt = m.index + m[1].length;
  const slice = content.slice(insertAt, insertAt + 200);
  if (slice.includes("useTranslations")) return content;
  return content.slice(0, insertAt) + "\n" + hookLines + content.slice(insertAt);
}

// ─── ParentBillingTab ───────────────────────────────────────────────────────
function migrateParentBillingTab(content) {
  content = ensureImport(content);
  content = content.replace(
    /const STATUS_STYLES: Record<string, \{ label: string; bg: string; text: string \}> = \{[\s\S]*?\};/,
    `const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  paid: { bg: "#dcfce7", text: "#16a34a" },
  sent: { bg: "#fef9c3", text: "#ca8a04" },
  overdue: { bg: "#fee2e2", text: "#dc2626" },
  draft: { bg: "#f1f5f9", text: "#64748b" },
  void: { bg: "#f1f5f9", text: "#94a3b8" },
  refunded: { bg: "#ede9fe", text: "#7c3aed" },
};`,
  );
  content = content.replace(
    /function StatusBadge\(\{ status \}: \{ status: string \}\) \{\n  const s = STATUS_STYLES\[status\] \?\? \{ label: status, bg: "#f1f5f9", text: "#64748b" \};/,
    `function StatusBadge({ status }: { status: string }) {
  const tStatus = useTranslations("admin.shared.status");
  const s = STATUS_STYLES[status] ?? { bg: "#f1f5f9", text: "#64748b" };
  const label = (["paid","sent","overdue","draft","void","refunded"] as const).includes(status as never)
    ? tStatus(status as "paid")
    : status;`,
  );
  content = content.replace(/\{s\.label\}/, "{label}");
  content = content.replace(
    /if \(!iso\) return "—";/,
    `if (!iso) return "—"; // dash kept literal`,
  );
  content = addHookAfterBrace(
    content,
    "export default function ParentBillingTab",
    `  const t = useTranslations("admin.parents.billing");
  const tShared = useTranslations("admin.shared");`,
  );
  const reps = [
    ['"Outstanding"', 't("outstanding")'],
    ['"Total received"', 't("totalReceived")'],
    ['"Invoices"', 't("invoices")'],
    ['"No invoices yet."', 't("noInvoices")'],
    ['"Issued"', 't("table.issued")'],
    ['"Student"', 't("table.student")'],
    ['"Amount"', 't("table.amount")'],
    ['"Due"', 't("table.due")'],
    ['"Status"', 't("table.status")'],
    ['inv.studentName ?? "—"', 'inv.studentName ?? tShared("dash")'],
    ['"Payment receipts"', 't("paymentReceipts")'],
    ['"No payments recorded yet."', 't("noPayments")'],
    ['"Date"', 't("receiptsTable.date")'],
    ['t("table.amount")', 't("receiptsTable.amount")', 1], // second Amount in receipts - need careful
    ['"Invoice"', 't("receiptsTable.invoice")'],
    ['"Reference"', 't("receiptsTable.reference")'],
    ['"Shop orders"', 't("shopOrders")'],
    ['"Status"', 't("ordersTable.status")'],
  ];
  // Manual section replacements for ParentBillingTab
  content = content
    .replace(/<p className="text-xs font-semibold uppercase tracking-wider text-muted">Outstanding<\/p>/, '<p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("outstanding")}</p>')
    .replace(/<p className="text-xs font-semibold uppercase tracking-wider text-muted">Total received<\/p>/, '<p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("totalReceived")}</p>')
    .replace(/<p className="text-xs font-semibold uppercase tracking-wider text-muted">Invoices<\/p>/, '<p className="text-xs font-semibold uppercase tracking-wider text-muted">{t("invoices")}</p>')
    .replace(/<h3 className="mb-3 text-sm font-bold text-ink">Invoices<\/h3>/, '<h3 className="mb-3 text-sm font-bold text-ink">{t("invoicesTitle")}</h3>')
    .replace(/No invoices yet\./, '{t("noInvoices")}')
    .replace(/<th className="px-4 py-3 font-semibold">Issued<\/th>/, '<th className="px-4 py-3 font-semibold">{t("table.issued")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Student<\/th>/, '<th className="px-4 py-3 font-semibold">{t("table.student")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Amount<\/th>/g, '<th className="px-4 py-3 font-semibold">{t("table.amount")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Due<\/th>/, '<th className="px-4 py-3 font-semibold">{t("table.due")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Status<\/th>/g, (m, offset) => {
      // first status in invoices, second in orders
      return '<th className="px-4 py-3 font-semibold">{t("table.status")}</th>';
    })
    .replace(/inv\.studentName \?\? "—"/, 'inv.studentName ?? tShared("dash")')
    .replace(/<h3 className="mb-3 text-sm font-bold text-ink">Payment receipts<\/h3>/, '<h3 className="mb-3 text-sm font-bold text-ink">{t("paymentReceipts")}</h3>')
    .replace(/No payments recorded yet\./, '{t("noPayments")}')
    .replace(/<th className="px-4 py-3 font-semibold">Date<\/th>/g, '<th className="px-4 py-3 font-semibold">{t("receiptsTable.date")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Invoice<\/th>/, '<th className="px-4 py-3 font-semibold">{t("receiptsTable.invoice")}</th>')
    .replace(/<th className="px-4 py-3 font-semibold">Reference<\/th>/, '<th className="px-4 py-3 font-semibold">{t("receiptsTable.reference")}</th>')
    .replace(/<h3 className="mb-3 text-sm font-bold text-ink">Shop orders<\/h3>/, '<h3 className="mb-3 text-sm font-bold text-ink">{t("shopOrders")}</h3>');
  // Fix receipts amount header (second Amount column)
  content = content.replace(
    /(paymentReceipts[\s\S]*?<th[^>]*>\{t\("table\.amount"\)\}<\/th>)/,
    (m) => m.replace('{t("table.amount")}', '{t("receiptsTable.amount")}'),
  );
  // Fix orders status header  
  const ordersIdx = content.indexOf('shopOrders');
  if (ordersIdx > 0) {
    const before = content.slice(0, ordersIdx);
    const after = content.slice(ordersIdx);
    content = before + after.replace(
      '{t("table.status")}',
      '{t("ordersTable.status")}',
    );
  }
  return content;
}

// Write migrated files using hand-crafted full content for reliability
const files = {
  "components/admin/parents/ParentBillingTab.tsx": null, // use function above
};

// For large files, we'll apply patch-based migrations
function patchFile(relPath, patches) {
  const full = path.join(ROOT, relPath);
  let content = fs.readFileSync(full, "utf8");
  for (const [from, to] of patches) {
    if (!content.includes(from)) {
      console.warn(`WARN [${relPath}] pattern not found: ${from.slice(0, 60)}...`);
    } else {
      content = content.replace(from, to);
    }
  }
  fs.writeFileSync(full, content);
  console.log(`Patched ${relPath}`);
}

// Apply ParentBillingTab via function
{
  const p = path.join(ROOT, "components/admin/parents/ParentBillingTab.tsx");
  fs.writeFileSync(p, migrateParentBillingTab(fs.readFileSync(p, "utf8")));
  console.log("Migrated ParentBillingTab.tsx");
}

console.log("Done partial migration - run full file writes for remaining files");
