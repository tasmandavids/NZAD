"use client";

import { useState } from "react";
import type { PageTemplate, TemplateCategory } from "@/lib/site/template-types";
import { TEMPLATE_CATEGORIES, getTemplateBlockPreview } from "@/lib/site/templates";

const BLOCK_LABELS: Record<string, string> = {
  hero: "Hero",
  features: "Features",
  classGrid: "Classes",
  testimonials: "Reviews",
  cta: "CTA",
  contact: "Contact",
  gallery: "Gallery",
  statsRow: "Stats",
  classStreams: "Streams",
  newsFeed: "News",
  richText: "Story",
  peopleGrid: "Team",
  schedule: "Schedule",
  faq: "FAQ",
  pageHeader: "Header",
};

type Props = {
  templates: PageTemplate[];
  selectedId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

export function TemplateGallery({ templates, selectedId, onSelect, disabled }: Props) {
  const [category, setCategory] = useState<TemplateCategory | "all">("all");

  const filtered =
    category === "all" ? templates : templates.filter((t) => t.category === category);

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TEMPLATE_CATEGORIES.filter((c) =>
          c.id === "all" || templates.some((t) => t.category === c.id),
        ).map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setCategory(c.id)}
            className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition ${
              category === c.id
                ? "bg-brand text-white"
                : "border border-[--hair] text-muted hover:text-ink"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((t) => (
          <TemplateCard
            key={t.id}
            template={t}
            selected={selectedId === t.id}
            disabled={disabled}
            onClick={() => onSelect(t.id)}
          />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-6 text-center text-sm text-muted">No templates in this category.</p>
      )}
    </div>
  );
}

function TemplateCard({
  template,
  selected,
  disabled,
  onClick,
}: {
  template: PageTemplate;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const accent = template.previewAccent ?? template.suggestedBrandColor ?? "#6B66C9";
  const blocks = getTemplateBlockPreview(template);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`group flex flex-col overflow-hidden rounded-xl border text-left transition disabled:opacity-50 ${
        selected ? "border-brand ring-2 ring-brand/30" : "border-[--hair] hover:border-brand/50"
      }`}
    >
      <div
        className="relative flex h-24 flex-col justify-end p-3"
        style={{
          background: `linear-gradient(135deg, ${accent}22 0%, ${accent}44 50%, ${accent}22 100%)`,
        }}
      >
        <div className="absolute inset-0 flex flex-col gap-1 p-3 opacity-60">
          {blocks.slice(0, 4).map((type, i) => (
            <div
              key={`${type}-${i}`}
              className="h-2 rounded-sm"
              style={{
                width: `${70 - i * 12}%`,
                background: accent,
                opacity: 0.25 + i * 0.1,
              }}
            />
          ))}
        </div>
        {selected && (
          <span className="absolute right-2 top-2 rounded-full bg-brand px-2 py-0.5 text-[0.6rem] font-bold uppercase text-white">
            Selected
          </span>
        )}
        <span
          className="relative text-lg font-bold leading-tight"
          style={{ fontFamily: "var(--font-display, system-ui)", color: accent }}
        >
          {template.label}
        </span>
      </div>
      <div className="space-y-2 bg-surface p-3">
        <p className="text-xs leading-relaxed text-muted">{template.description}</p>
        <div className="flex flex-wrap gap-1">
          {blocks.map((type, i) => (
            <span
              key={`${type}-${i}`}
              className="rounded-md bg-base px-1.5 py-0.5 text-[0.6rem] font-medium text-muted"
            >
              {BLOCK_LABELS[type] ?? type}
            </span>
          ))}
        </div>
      </div>
    </button>
  );
}
