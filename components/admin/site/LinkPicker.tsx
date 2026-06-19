"use client";

import { useTranslations } from "next-intl";
import type { SitePageLink } from "@/lib/site/page-links";

const LINK_FIELD_KEYS = new Set([
  "href",
  "buttonHref",
  "primaryHref",
  "secondaryHref",
  "linkHref",
]);

export function isLinkField(key: string): boolean {
  return LINK_FIELD_KEYS.has(key);
}

export default function LinkPicker({
  value,
  pages,
  onChange,
}: {
  value: string;
  pages: SitePageLink[];
  onChange: (href: string) => void;
}) {
  const t = useTranslations("site.linkPicker");
  const isExternal = value.startsWith("http://") || value.startsWith("https://") || value.startsWith("mailto:");
  const matched = pages.find((p) => p.href === value);

  return (
    <div className="space-y-2">
      <select
        value={matched?.href ?? (value && !isExternal ? "__custom__" : isExternal ? "__external__" : "")}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "__custom__" || v === "__external__" || v === "") return;
          onChange(v);
        }}
        className="field-premium"
      >
        <option value="">{t("pickPage")}</option>
        {pages.map((p) => (
          <option key={p.id} value={p.href}>
            {p.label} ({p.href})
          </option>
        ))}
        <option value="__custom__">{t("customPath")}</option>
        {isExternal && <option value="__external__">{t("externalUrl")}</option>}
      </select>
      <input
        type="text"
        value={value}
        placeholder={t("placeholder")}
        onChange={(e) => onChange(e.target.value)}
        className="field-premium"
      />
      <p className="text-[0.65rem] text-muted">{t("hint")}</p>
    </div>
  );
}
