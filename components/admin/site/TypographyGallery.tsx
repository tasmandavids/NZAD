"use client";

import { useEffect, useState } from "react";
import {
  TYPOGRAPHY_CATEGORIES,
  TYPOGRAPHY_PAIRS,
  filterTypography,
  type TypographyCategory,
  type TypographyPair,
} from "@/lib/site/typography";
import { googleFontsStylesheetUrl } from "@/lib/fonts";

type Props = {
  selectedId: string;
  onSelect: (pair: TypographyPair) => void;
  disabled?: boolean;
};

export function TypographyGallery({ selectedId, onSelect, disabled }: Props) {
  const [category, setCategory] = useState<TypographyCategory | "all">("all");
  const filtered = filterTypography(category);

  const selected = TYPOGRAPHY_PAIRS.find((t) => t.id === selectedId) ?? TYPOGRAPHY_PAIRS[0];
  useGoogleFontsPreview(selected.display, selectedBody(selected));

  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {TYPOGRAPHY_CATEGORIES.map((c) => (
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

      <div className="grid max-h-[360px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
        {filtered.map((pair) => (
          <TypographyCard
            key={pair.id}
            pair={pair}
            selected={selectedId === pair.id}
            disabled={disabled}
            onClick={() => onSelect(pair)}
          />
        ))}
      </div>
    </div>
  );
}

function TypographyCard({
  pair,
  selected,
  disabled,
  onClick,
}: {
  pair: TypographyPair;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl border p-3 text-left transition disabled:opacity-50 ${
        selected ? "border-brand bg-brand/5 ring-2 ring-brand/20" : "border-[--hair] hover:border-brand/50"
      }`}
    >
      <p
        className="text-2xl font-semibold leading-none text-ink"
        style={{ fontFamily: `"${pair.display}", system-ui, serif` }}
      >
        Aa
      </p>
      <p
        className="mt-1 truncate text-sm text-ink"
        style={{ fontFamily: `"${pair.body}", system-ui, sans-serif` }}
      >
        The quick brown fox
      </p>
      <p className="mt-2 text-xs font-semibold text-ink">{pair.label}</p>
      <p className="text-[0.65rem] text-muted">
        {pair.display} + {pair.body}
      </p>
    </button>
  );
}

function selectedBody(pair: TypographyPair): string {
  return pair.body;
}

/** Inject Google Fonts link for live preview of selected pair. */
function useGoogleFontsPreview(display: string, body: string) {
  useEffect(() => {
    const url = googleFontsStylesheetUrl(display, body);
    if (!url) return;
    const id = "setup-font-preview";
    let link = document.getElementById(id) as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      document.head.appendChild(link);
    }
    link.href = url;
  }, [display, body]);
}
