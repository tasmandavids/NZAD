"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createCampaign,
  deleteCampaign,
  disconnectSocialPlatform,
  generateAdWithAi,
  publishCampaign,
  applySeoModernization,
  runSeoAuditAction,
  OBJECTIVES,
} from "@/app/portal/admin/advertising/actions";
import type {
  AdCampaign,
  AdObjective,
  GeneratedAdCopy,
  SeoAudit,
  SeoPageSnapshot,
  SocialConnection,
  SocialPlatform,
} from "@/lib/advertising/types";
import { PLATFORM_META } from "@/lib/advertising/config";

type Tab = "campaigns" | "seo";

const PLATFORM_ICONS: Record<SocialPlatform, string> = {
  facebook: "f",
  instagram: "◎",
  tiktok: "♪",
};

function StatusBadge({ status }: { status: AdCampaign["status"] }) {
  const colors: Record<AdCampaign["status"], string> = {
    draft: "bg-slate-100 text-slate-600",
    scheduled: "bg-blue-100 text-blue-700",
    active: "bg-emerald-100 text-emerald-700",
    paused: "bg-amber-100 text-amber-700",
    completed: "bg-indigo-100 text-indigo-700",
    failed: "bg-red-100 text-red-700",
  };
  return (
    <span className={`rounded-full px-2 py-0.5 text-[0.62rem] font-semibold uppercase tracking-wide ${colors[status]}`}>
      {status}
    </span>
  );
}

function SocialConnectionsPanel({
  connections,
  metaConfigured,
  tiktokConfigured,
  onDisconnect,
}: {
  connections: SocialConnection[];
  metaConfigured: boolean;
  tiktokConfigured: boolean;
  onDisconnect: (p: SocialPlatform) => void;
}) {
  const t = useTranslations("admin.advertising");
  const connMap = new Map(connections.map((c) => [c.platform, c]));
  const platforms: SocialPlatform[] = ["facebook", "instagram", "tiktok"];

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {platforms.map((platform) => {
        const meta = PLATFORM_META[platform];
        const conn = connMap.get(platform);
        const configured = platform === "tiktok" ? tiktokConfigured : metaConfigured;

        return (
          <div
            key={platform}
            className="rounded-2xl border border-[--hair] bg-surface p-5"
          >
            <div className="mb-3 flex items-center gap-3">
              <span
                className="grid h-10 w-10 place-items-center rounded-xl text-lg font-black text-white"
                style={{ background: meta.color }}
              >
                {PLATFORM_ICONS[platform]}
              </span>
              <div>
                <p className="font-bold text-ink">{meta.label}</p>
                <p className="text-[0.65rem] text-muted">{conn ? t("social.connected") : t("social.notConnected")}</p>
              </div>
            </div>
            <p className="mb-4 text-xs leading-relaxed text-muted">{meta.description}</p>
            {conn ? (
              <div className="space-y-2">
                <p className="truncate text-xs font-medium text-ink">{conn.accountName ?? conn.accountId}</p>
                {conn.syncError && (
                  <p className="text-[0.65rem] text-red-600">{conn.syncError}</p>
                )}
                <button
                  type="button"
                  onClick={() => onDisconnect(platform)}
                  className="text-xs font-semibold text-red-600 hover:underline"
                >
                  {t("social.disconnect")}
                </button>
              </div>
            ) : configured ? (
              <a
                href={meta.connectPath}
                className="inline-flex rounded-xl px-4 py-2 text-xs font-bold text-white transition hover:brightness-105"
                style={{ background: meta.color }}
              >
                {t("social.connect", { platform: meta.label })}
              </a>
            ) : (
              <p className="text-[0.65rem] text-muted">
                {t("social.oauthNotConfigured")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AdCreatorPanel({
  connectedPlatforms,
  onCreated,
}: {
  connectedPlatforms: SocialPlatform[];
  onCreated: () => void;
}) {
  const t = useTranslations("admin.advertising");
  const tShared = useTranslations("admin.shared");
  const [prompt, setPrompt] = useState("");
  const [objective, setObjective] = useState<AdObjective>("traffic");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["facebook"]);
  const [targetUrl, setTargetUrl] = useState("");
  const [generated, setGenerated] = useState<GeneratedAdCopy | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerate] = useTransition();
  const [saving, startSave] = useTransition();

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  }

  function handleGenerate() {
    setError(null);
    startGenerate(async () => {
      const res = await generateAdWithAi({ prompt, objective, platforms, targetUrl });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setGenerated(res.copy);
      if (!campaignName) setCampaignName(prompt.slice(0, 60) || t("adCreator.untitledCampaign"));
    });
  }

  function handleSave(publish: boolean) {
    if (!generated) return;
    setError(null);
    startSave(async () => {
      const res = await createCampaign({
        name: campaignName || t("adCreator.untitledCampaign"),
        objective,
        platforms,
        headline: generated.headline,
        bodyText: generated.bodyText,
        callToAction: generated.callToAction,
        imageUrl,
        videoUrl,
        targetUrl,
        aiGenerated: true,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (publish) {
        const pub = await publishCampaign(res.id);
        if (!pub.ok) setError(pub.error);
      }
      setGenerated(null);
      setPrompt("");
      setCampaignName("");
      onCreated();
    });
  }

  return (
    <div className="rounded-2xl border border-[--hair] bg-surface p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-brand">{t("adCreator.badge")}</p>
          <h2 className="text-lg font-black text-ink">{t("adCreator.title")}</h2>
          <p className="mt-1 text-xs text-muted">
            {t("adCreator.description")}
          </p>
        </div>
        <span className="rounded-full bg-brand/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-brand">
          {t("adCreator.aiAgent")}
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-semibold text-ink">{t("adCreator.promptLabel")}</label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={3}
            placeholder={t("adCreator.promptPlaceholder")}
            className="w-full rounded-xl border border-[--hair] bg-base px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-brand focus:outline-none"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">{t("adCreator.objective")}</label>
            <select
              value={objective}
              onChange={(e) => setObjective(e.target.value as AdObjective)}
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink"
            >
              {OBJECTIVES.map((o) => (
                <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">{t("adCreator.targetUrl")}</label>
            <input
              type="url"
              value={targetUrl}
              onChange={(e) => setTargetUrl(e.target.value)}
              placeholder={t("adCreator.targetUrlPlaceholder")}
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm text-ink placeholder:text-muted"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-ink">{t("adCreator.platforms")}</label>
          <div className="flex flex-wrap gap-2">
            {(["facebook", "instagram", "tiktok"] as SocialPlatform[]).map((p) => {
              const active = platforms.includes(p);
              const connected = connectedPlatforms.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePlatform(p)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    active
                      ? "text-white"
                      : "border border-[--hair] bg-base text-muted hover:text-ink"
                  }`}
                  style={active ? { background: PLATFORM_META[p].color } : undefined}
                  title={connected ? undefined : t("adCreator.notConnectedTitle")}
                >
                  {PLATFORM_META[p].label}
                  {!connected && active && t("adCreator.draftSuffix")}
                </button>
              );
            })}
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !prompt.trim()}
          className="rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50"
        >
          {generating ? tShared("generating") : t("adCreator.generate")}
        </button>

        <AnimatePresence>
          {generated && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-4 rounded-xl border border-brand/20 bg-brand/5 p-4"
            >
              <div>
                <p className="text-[0.62rem] font-semibold uppercase tracking-wide text-brand">{t("adCreator.generatedCopy")}</p>
                <p className="mt-2 text-sm font-bold text-ink">{generated.headline}</p>
                <p className="mt-1 text-sm text-muted">{generated.bodyText}</p>
                <p className="mt-2 text-xs font-semibold text-ink">{t("adCreator.cta", { cta: generated.callToAction })}</p>
                {generated.hashtags.length > 0 && (
                  <p className="mt-1 text-xs text-muted">{generated.hashtags.join(" ")}</p>
                )}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder={t("adCreator.campaignName")}
                  className="rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder={t("adCreator.imageUrl")}
                  className="rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
                />
                <input
                  type="url"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={t("adCreator.videoUrl")}
                  className="rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm sm:col-span-2"
                />
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => handleSave(false)}
                  disabled={saving}
                  className="rounded-xl border border-[--hair] bg-surface px-4 py-2 text-sm font-semibold text-ink hover:bg-base disabled:opacity-50"
                >
                  {t("adCreator.saveDraft")}
                </button>
                <button
                  type="button"
                  onClick={() => handleSave(true)}
                  disabled={saving}
                  className="rounded-xl bg-brand px-4 py-2 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50"
                >
                  {saving ? tShared("publishing") : t("adCreator.saveAndPublish")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}

function CampaignsList({
  campaigns,
  onRefresh,
}: {
  campaigns: AdCampaign[];
  onRefresh: () => void;
}) {
  const t = useTranslations("admin.advertising");
  const tCommon = useTranslations("common");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handlePublish(id: string) {
    setError(null);
    startTransition(async () => {
      const res = await publishCampaign(id);
      if (!res.ok) setError(res.error);
      else onRefresh();
    });
  }

  function handleDelete(id: string) {
    if (!window.confirm(t("campaigns.deleteConfirm"))) return;
    startTransition(async () => {
      await deleteCampaign(id);
      onRefresh();
    });
  }

  if (campaigns.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[--hair] bg-surface/50 px-6 py-12 text-center">
        <p className="text-sm text-muted">{t("campaigns.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {campaigns.map((c) => (
        <div key={c.id} className="rounded-2xl border border-[--hair] bg-surface p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-ink">{c.name}</h3>
                <StatusBadge status={c.status} />
                {c.aiGenerated && (
                  <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[0.58rem] font-bold uppercase text-brand">{t("campaigns.aiBadge")}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                {c.platforms.map((p) => PLATFORM_META[p].label).join(" · ")} · {c.objective}
              </p>
              {c.headline && <p className="mt-2 text-sm text-ink">{c.headline}</p>}
              {c.publishError && <p className="mt-1 text-xs text-red-600">{c.publishError}</p>}
            </div>
            <div className="flex gap-2">
              {(c.status === "draft" || c.status === "scheduled" || c.status === "failed") && (
                <button
                  type="button"
                  onClick={() => handlePublish(c.id)}
                  disabled={pending}
                  className="rounded-xl bg-brand px-3 py-1.5 text-xs font-bold text-white hover:brightness-105 disabled:opacity-50"
                >
                  {t("campaigns.publish")}
                </button>
              )}
              <button
                type="button"
                onClick={() => handleDelete(c.id)}
                disabled={pending}
                className="rounded-xl border border-[--hair] px-3 py-1.5 text-xs font-semibold text-muted hover:text-red-600 disabled:opacity-50"
              >
                {tCommon("delete")}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function SeoPanel({
  pages,
  audits,
  onRefresh,
}: {
  pages: SeoPageSnapshot[];
  audits: SeoAudit[];
  onRefresh: () => void;
}) {
  const t = useTranslations("admin.advertising");
  const tShared = useTranslations("admin.shared");
  const [focusPageId, setFocusPageId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [lastSummary, setLastSummary] = useState<string | null>(null);
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [auditing, startAudit] = useTransition();
  const [modernizing, startModernize] = useTransition();

  function handleAudit() {
    setError(null);
    startAudit(async () => {
      const res = await runSeoAuditAction(focusPageId || null);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setLastSummary(res.summary);
      setLastScore(res.score);
      onRefresh();
    });
  }

  function handleModernize(pageId: string) {
    setError(null);
    startModernize(async () => {
      const res = await applySeoModernization(pageId);
      if (!res.ok) setError(res.error);
      else onRefresh();
    });
  }

  const latestAudit = audits[0];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[--hair] bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-brand">{t("seo.badge")}</p>
            <h2 className="text-lg font-black text-ink">{t("seo.title")}</h2>
            <p className="mt-1 text-xs text-muted">
              {t("seo.description")}
            </p>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-wide text-brand">
            {t("adCreator.aiAgent")}
          </span>
        </div>

        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink">{t("seo.auditScope")}</label>
            <select
              value={focusPageId}
              onChange={(e) => setFocusPageId(e.target.value)}
              className="w-full rounded-xl border border-[--hair] bg-base px-4 py-2.5 text-sm"
            >
              <option value="">{t("seo.allPages")}</option>
              {pages.map((p) => (
                <option key={p.id} value={p.id}>{t("seo.pageOption", { title: p.title, slug: p.slug })}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={handleAudit}
              disabled={auditing || pages.length === 0}
              className="w-full rounded-xl bg-brand px-5 py-2.5 text-sm font-bold text-white hover:brightness-105 disabled:opacity-50"
            >
              {auditing ? tShared("runningAudit") : t("seo.runAudit")}
            </button>
          </div>
        </div>

        {(lastScore !== null || latestAudit?.score !== null) && (
          <div className="mb-4 flex items-center gap-4 rounded-xl border border-[--hair] bg-base p-4">
            <div
              className="grid h-16 w-16 place-items-center rounded-full text-xl font-black text-white"
              style={{
                background: (lastScore ?? latestAudit?.score ?? 0) >= 70 ? "#22c55e" : (lastScore ?? latestAudit?.score ?? 0) >= 40 ? "#f59e0b" : "#ef4444",
              }}
            >
              {lastScore ?? latestAudit?.score}
            </div>
            <p className="flex-1 text-sm text-muted">{lastSummary ?? latestAudit?.aiSummary}</p>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {latestAudit && latestAudit.recommendations.length > 0 && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-6">
          <h3 className="mb-4 font-bold text-ink">{t("seo.recommendations")}</h3>
          <div className="space-y-3">
            {latestAudit.recommendations.map((rec) => (
              <div key={rec.id} className="rounded-xl border border-[--hair] bg-base p-4">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[0.58rem] font-bold uppercase ${
                    rec.priority === "high" ? "bg-red-100 text-red-700"
                      : rec.priority === "medium" ? "bg-amber-100 text-amber-700"
                        : "bg-slate-100 text-slate-600"
                  }`}>
                    {rec.priority}
                  </span>
                  <span className="text-[0.62rem] font-semibold uppercase tracking-wide text-muted">{rec.category}</span>
                </div>
                <p className="mt-2 text-sm font-semibold text-ink">{rec.title}</p>
                <p className="mt-1 text-xs text-muted">{rec.description}</p>
                {rec.suggestedFix && (
                  <p className="mt-2 rounded-lg bg-brand/5 px-3 py-2 text-xs text-ink">
                    {t("seo.suggested", { fix: rec.suggestedFix })}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-[--hair] bg-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-bold text-ink">{t("seo.pageSeo")}</h3>
          <Link href="/portal/admin/site" className="text-xs font-semibold text-brand hover:underline">
            {t("seo.openBuilder")}
          </Link>
        </div>
        <div className="space-y-3">
          {pages.length === 0 ? (
            <p className="text-sm text-muted">{t("seo.noPages")}</p>
          ) : (
            pages.map((page) => (
              <div key={page.id} className="flex flex-wrap items-start justify-between gap-3 rounded-xl border border-[--hair] bg-base p-4">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">{page.title}</p>
                  <p className="text-[0.65rem] text-muted">/{page.slug} · {page.status}</p>
                  <p className="mt-2 text-xs text-ink">
                    {page.seoTitle || <span className="text-red-500">{t("seo.noSeoTitle")}</span>}
                  </p>
                  <p className="mt-0.5 text-xs text-muted line-clamp-2">
                    {page.seoDescription || t("seo.noMetaDescription")}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleModernize(page.id)}
                  disabled={modernizing}
                  className="shrink-0 rounded-xl border border-brand/30 bg-brand/5 px-3 py-1.5 text-xs font-bold text-brand hover:bg-brand/10 disabled:opacity-50"
                >
                  {modernizing ? tShared("modernizing") : t("seo.aiModernize")}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function AdvertisingHub({
  connections,
  campaigns,
  pages,
  audits,
  metaConfigured,
  tiktokConfigured,
  bannerError,
  bannerConnected,
}: {
  connections: SocialConnection[];
  campaigns: AdCampaign[];
  pages: SeoPageSnapshot[];
  audits: SeoAudit[];
  metaConfigured: boolean;
  tiktokConfigured: boolean;
  bannerError: string | null;
  bannerConnected: string | null;
}) {
  const t = useTranslations("admin.advertising");
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("campaigns");
  const [actionError, setActionError] = useState<string | null>(null);
  const [, startDisconnect] = useTransition();

  const connectedPlatforms = connections.map((c) => c.platform);

  function refresh() {
    router.refresh();
  }

  function handleDisconnect(platform: SocialPlatform) {
    if (!window.confirm(t("disconnectConfirm", { platform: PLATFORM_META[platform].label }))) return;
    setActionError(null);
    startDisconnect(async () => {
      const res = await disconnectSocialPlatform(platform);
      if (!res.ok) setActionError(res.error);
      else refresh();
    });
  }

  const displayError = bannerError ?? actionError;

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      className="mx-auto max-w-6xl space-y-6 p-6"
    >
      <motion.header
        variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
      >
        <h1 className="text-2xl font-black tracking-tight text-ink">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("subtitle")}
        </p>
      </motion.header>

      {(displayError || bannerConnected) && (
        <motion.div variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
          {bannerConnected && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              {bannerConnected === "meta"
                ? t("metaConnected")
                : t("platformConnected", {
                    platform: `${bannerConnected.charAt(0).toUpperCase()}${bannerConnected.slice(1)}`,
                  })}
            </div>
          )}
          {displayError && (
            <div className={`rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 ${bannerConnected ? "mt-2" : ""}`}>
              {displayError}
            </div>
          )}
        </motion.div>
      )}

      <motion.div
        variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
        className="flex gap-1 rounded-xl border border-[--hair] bg-surface p-1"
      >
        {([
          { id: "campaigns" as Tab, label: t("tabs.campaigns") },
          { id: "seo" as Tab, label: t("tabs.seo") },
        ]).map((tabItem) => (
          <button
            key={tabItem.id}
            type="button"
            onClick={() => setTab(tabItem.id)}
            className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
              tab === tabItem.id ? "bg-brand text-white shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {tabItem.label}
          </button>
        ))}
      </motion.div>

      <AnimatePresence mode="wait">
        {tab === "campaigns" ? (
          <motion.div
            key="campaigns"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="space-y-6"
          >
            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">{t("connectedPlatforms")}</h2>
              <SocialConnectionsPanel
                connections={connections}
                metaConfigured={metaConfigured}
                tiktokConfigured={tiktokConfigured}
                onDisconnect={handleDisconnect}
              />
            </section>

            <AdCreatorPanel connectedPlatforms={connectedPlatforms} onCreated={refresh} />

            <section>
              <h2 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">{t("yourCampaigns")}</h2>
              <CampaignsList campaigns={campaigns} onRefresh={refresh} />
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="seo"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <SeoPanel pages={pages} audits={audits} onRefresh={refresh} />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
