"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AccountingSnapshot } from "@/lib/xero/accounting-data";
import { openInXeroUrl } from "@/lib/xero/links";
import { formatMonthKey, formatShortDate, formatSyncTime } from "@/lib/xero/format";
import { disconnectXero, refreshAccountingData } from "@/app/portal/admin/accounting/actions";

const NZD = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD", maximumFractionDigits: 0 });
const NZD2 = new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" });

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-[--hair] bg-surface p-5">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-1 text-2xl font-black text-ink">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-muted">{sub}</p>}
    </div>
  );
}

export function AccountingDashboard({
  snapshot,
  redirectUri,
  bannerError,
  bannerConnected,
}: {
  snapshot: AccountingSnapshot;
  redirectUri: string;
  bannerError: string | null;
  bannerConnected: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [refreshing, startRefresh] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const summary = snapshot.summary;
  const orgShortCode = snapshot.connection?.org_short_code ?? null;

  const chartData = useMemo(
    () =>
      (summary?.monthlySeries ?? []).map((row) => ({
        month: formatMonthKey(row.month),
        income: row.incomeCents / 100,
        expenses: row.expenseCents / 100,
      })),
    [summary?.monthlySeries],
  );

  const onRefresh = () => {
    setActionError(null);
    startRefresh(async () => {
      const res = await refreshAccountingData();
      if (!res.ok) setActionError(res.error);
      else router.refresh();
    });
  };

  const onDisconnect = () => {
    setActionError(null);
    if (!window.confirm("Disconnect Xero? Olune will stop syncing sales and showing accounting data.")) return;
    startTransition(async () => {
      const res = await disconnectXero();
      if (!res.ok) setActionError(res.error);
    });
  };

  const displayError =
    bannerError ?? actionError ?? snapshot.fetchError ?? snapshot.connection?.sync_error ?? null;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
      className="mx-auto max-w-6xl space-y-8 p-6"
    >
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="flex flex-wrap items-start justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black tracking-tight text-ink">Accounting</h1>
          <p className="mt-1 text-sm text-muted">
            Income, expenses &amp; profit from Xero — full detail stays in your Xero organisation.
          </p>
        </div>
        {snapshot.connected && (
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing || pending}
              className="rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-base disabled:opacity-50"
            >
              {refreshing ? "Refreshing…" : "Refresh"}
            </button>
            <a
              href={openInXeroUrl(orgShortCode, "dashboard")}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-[#13B5EA] px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:brightness-105"
            >
              <XeroMark />
              Open in Xero
            </a>
            <a
              href={openInXeroUrl(orgShortCode, "reports")}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-[--hair] bg-surface px-4 py-2.5 text-sm font-semibold text-ink hover:bg-base"
            >
              Reports
            </a>
          </div>
        )}
      </motion.header>

      {(displayError || bannerConnected) && (
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
          {bannerConnected && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Xero connected successfully.
            </div>
          )}
          {displayError && (
            <div className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${bannerConnected ? "mt-2" : ""}`}>
              {displayError}
            </div>
          )}
          {!displayError && snapshot.connected && summary && summary.monthlySeries.length === 0 && (
            <div className={`rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 ${bannerConnected ? "mt-2" : ""}`}>
              Connected to Xero, but no P&L rows were returned yet. If this is a new organisation, add a few transactions in Xero first.
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
        className="rounded-2xl border border-[--hair] bg-surface p-5"
      >
        {!snapshot.configured ? (
          <p className="text-sm text-muted">
            Xero is not configured on this environment. Add <code className="text-xs">XERO_CLIENT_ID</code> and{" "}
            <code className="text-xs">XERO_CLIENT_SECRET</code> to connect.
          </p>
        ) : snapshot.connected ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-ink">{snapshot.connection?.tenant_name}</p>
              <p className="text-xs text-muted">
                Last synced{" "}
                {snapshot.connection?.last_sync_at
                  ? formatSyncTime(snapshot.connection.last_sync_at)
                  : "just now"}
                · Olune sales sync {snapshot.connection?.settings?.sync_enabled === false ? "off" : "on"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing || pending}
                className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs font-semibold text-ink hover:bg-base disabled:opacity-50"
              >
                {refreshing ? "Refreshing…" : "Refresh data"}
              </button>
              <button
                type="button"
                onClick={onDisconnect}
                disabled={pending || refreshing}
                className="rounded-lg border border-[--hair] px-3 py-1.5 text-xs font-semibold text-muted hover:text-ink disabled:opacity-50"
              >
                {pending ? "Disconnecting…" : "Disconnect"}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="text-sm text-muted">
                Connect your Xero organisation to see income, expenses, and sync Olune purchases as invoices.
              </p>
              <Link
                href="/api/xero/oauth/connect"
                className="inline-flex items-center gap-2 rounded-xl bg-[#13B5EA] px-4 py-2.5 text-sm font-bold text-white"
              >
                <XeroMark />
                Connect Xero
              </Link>
            </div>
            <div className="rounded-xl border border-[--hair] bg-base/60 px-4 py-3 text-xs text-muted">
              <p className="font-semibold text-ink">Xero app setup — add this OAuth 2.0 redirect URI</p>
              <p className="mt-1">
                In{" "}
                <a
                  href="https://developer.xero.com/app/manage"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-[#13B5EA] hover:underline"
                >
                  developer.xero.com
                </a>
                , open your app → <strong>Configuration</strong> → <strong>OAuth 2.0 redirect URIs</strong> (not
                Company URL). Add exactly:
              </p>
              <code className="mt-2 block break-all rounded-lg bg-surface px-3 py-2 text-[0.7rem] text-ink">
                {redirectUri}
              </code>
              <p className="mt-2">
                If you browse Olune via <code className="text-[0.65rem]">127.0.0.1</code>, also add{" "}
                <code className="text-[0.65rem]">http://127.0.0.1:3000/api/xero/oauth/callback</code>.
              </p>
            </div>
          </div>
        )}
      </motion.div>

      {snapshot.connected && summary && (
        <>
          <motion.div
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
          >
            <StatCard label="Income (MTD)" value={NZD.format(summary.incomeMtdCents / 100)} sub="From Xero P&L" />
            <StatCard label="Expenses (MTD)" value={NZD.format(summary.expenseMtdCents / 100)} sub="From Xero P&L" />
            <StatCard
              label="Net profit (MTD)"
              value={NZD.format(summary.netMtdCents / 100)}
              sub={summary.netMtdCents >= 0 ? "In the black" : "In the red"}
            />
            <StatCard label="Net profit (YTD)" value={NZD.format(summary.netYtdCents / 100)} sub="Calendar year" />
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-[--hair] bg-surface p-6"
          >
            <h2 className="mb-5 text-sm font-bold text-ink">Income vs expenses (last 12 months)</h2>
            {chartData.length === 0 ? (
              <p className="text-sm text-muted">No P&L data available yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <CartesianGrid vertical={false} stroke="var(--hair)" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
                  <YAxis
                    tickFormatter={(v: number) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
                    tick={{ fontSize: 11, fill: "var(--muted)" }}
                    axisLine={false}
                    tickLine={false}
                    width={48}
                  />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      NZD2.format(Number(value)),
                      name === "income" ? "Income" : "Expenses",
                    ]}
                    contentStyle={{
                      background: "var(--base)",
                      border: "1px solid var(--hair)",
                      borderRadius: 12,
                      fontSize: 12,
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="income" name="Income" fill="var(--brand)" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="expenses" name="Expenses" fill="#64748b" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div
            variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
            className="rounded-2xl border border-[--hair] bg-surface"
          >
            <div className="flex items-center justify-between border-b border-[--hair] px-6 py-4">
              <h2 className="text-sm font-bold text-ink">Recent Xero invoices</h2>
              <a
                href={openInXeroUrl(orgShortCode, "invoices")}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-semibold text-[#13B5EA] hover:underline"
              >
                View all in Xero
              </a>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-[--hair]">
                    {["Reference", "Contact", "Amount", "Date", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[0.62rem] font-semibold uppercase tracking-wider text-muted"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {snapshot.activity.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted">
                        No recent invoices in Xero.
                      </td>
                    </tr>
                  ) : (
                    snapshot.activity.map((row) => (
                      <tr key={row.id} className="border-b border-[--hair] last:border-0">
                        <td className="px-4 py-3 font-medium text-ink">{row.reference}</td>
                        <td className="px-4 py-3 text-muted">{row.contactName ?? "—"}</td>
                        <td className="px-4 py-3 font-semibold tabular-nums text-ink">
                          {NZD2.format(row.amountCents / 100)}
                        </td>
                        <td className="px-4 py-3 text-muted">{formatShortDate(row.date)}</td>
                        <td className="px-4 py-3 text-muted">{row.status ?? "—"}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </motion.div>
        </>
      )}

      {!snapshot.connected && (
        <motion.div
          variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          className="rounded-2xl border border-dashed border-[--hair] bg-base/50 p-10 text-center"
        >
          <p className="text-sm text-muted">
            Expenditure tracking and full accounting detail live in Xero. Olune Billing continues to handle Stripe
            payments and refunds; connect Xero to mirror sales and view your complete P&L here.
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}

function XeroMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <circle cx="12" cy="12" r="10" fill="white" fillOpacity="0.2" />
      <text x="12" y="16" textAnchor="middle" fontSize="11" fontWeight="700" fill="currentColor">
        X
      </text>
    </svg>
  );
}
