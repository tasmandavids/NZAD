// ============================================================================
//  components/site/BlockRenderer.tsx
//  Server wrapper around ClientBlockRenderer (loads i18n labels on the server).
// ============================================================================

import { getTranslations } from "@/lib/i18n/server";
import type { PageBackground } from "@/lib/site/background";
import type { Block } from "@/lib/site/blocks";
import type { RenderContext } from "@/lib/site/render-context";
import { ClientBlockRenderer, type PublicLabels } from "@/components/site/ClientBlockRenderer";

export type { RenderContext } from "@/lib/site/render-context";
export type { PublicLabels } from "@/components/site/ClientBlockRenderer";

export async function BlockRenderer({
  blocks,
  context,
  background,
  embedded = false,
}: {
  blocks: Block[];
  context: RenderContext;
  background?: PageBackground;
  embedded?: boolean;
}) {
  const t = await getTranslations("site.public");
  const labels: PublicLabels = {
    emptyPage: t("emptyPage"),
    addImage: t("addImage"),
    addVideo: t("addVideo"),
    teamComingSoon: t("teamComingSoon"),
    classesComingSoon: t("classesComingSoon"),
    allLevels: t("allLevels"),
    perMonth: t("perMonth"),
    galleryEmpty: t("galleryEmpty"),
    contactAddress: t("contactLabels.address"),
    contactPhone: t("contactLabels.phone"),
    contactEmail: t("contactLabels.email"),
    contactHours: t("contactLabels.hours"),
    defaultHeading: t("defaultHeading"),
    defaultImageAlt: t("defaultImageAlt"),
    defaultLinkLabel: t("defaultLinkLabel"),
    spacerLabel: t("spacerLabel", { height: "{height}" }),
  };

  return (
    <ClientBlockRenderer
      blocks={blocks}
      context={context}
      background={background}
      embedded={embedded}
      labels={labels}
    />
  );
}
