"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createCampaign,
  generateAdWithAi,
  publishCampaign,
  OBJECTIVES,
} from "@/app/portal/admin/advertising/actions";
import { PLATFORM_META, PRIMARY_PLATFORMS } from "@/lib/advertising/config";
import type {
  AdObjective,
  GeneratedAdCopy,
  SocialConnection,
  SocialPlatform,
} from "@/lib/advertising/types";
import { PlatformPreviewGrid } from "./PlatformPreview";

export function AdComposer({
  connections,
  onCreated,
}: {
  connections: SocialConnection[];
  onCreated: () => void;
}) {
  const t = useTranslations("admin.advertising");
  const tShared = useTranslations("admin.shared");
  const connectedPlatforms = connections.map((c) => c.platform);
  const [prompt, setPrompt] = useState("");
  const [objective, setObjective] = useState<AdObjective>("traffic");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["facebook", "instagram"]);
  const [targetUrl, setTargetUrl] = useState("");
  const [generated, setGenerated] = useState<GeneratedAdCopy | null>(null);
  const [campaignName, setCampaignName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(true);
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

  const previewHeadline = generated?.headline ?? "";
  const previewBody = generated?.bodyText ?? prompt;
  const previewCta = generated?.callToAction ?? "";

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[--hair] bg-surface p-6">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[0.62rem] font-semibold uppercase tracking-widest text-brand">{t("adCreator.badge")}</p>
            <h2 className="text-lg font-black text-ink">{t("adCreator.title")}</h2>
            <p className="mt-1 text-xs text-muted">{t("adCreator.description")}</p>
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
              {PRIMARY_PLATFORMS.map((p) => {
                const active = platforms.includes(p);
                const connected = connectedPlatforms.includes(p);
                return (
                  <button
                    key={p}
                    type="button"
                    onClick={() => togglePlatform(p)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      active ? "text-white shadow-sm" : "border border-[--hair] bg-base text-muted hover:text-ink"
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
                  <button
                    type="button"
                    onClick={() => setShowPreview((v) => !v)}
                    className="rounded-xl border border-[--hair] px-4 py-2 text-sm font-semibold text-muted hover:text-ink"
                  >
                    {showPreview ? t("adCreator.hidePreview") : t("adCreator.showPreview")}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </div>

      {showPreview && platforms.length > 0 && (generated || prompt.trim()) && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-6">
          <h3 className="mb-4 text-sm font-bold uppercase tracking-wider text-muted">{t("adCreator.livePreview")}</h3>
          <PlatformPreviewGrid
            platforms={platforms}
            headline={previewHeadline}
            bodyText={previewBody}
            callToAction={previewCta}
            imageUrl={imageUrl || undefined}
            connections={connections}
          />
        </div>
      )}
    </div>
  );
}
