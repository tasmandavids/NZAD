"use client";

import { ClientBlockRenderer, usePublicLabels } from "@/components/site/ClientBlockRenderer";
import type { Block } from "@/lib/site/blocks";
import type { RenderContext } from "@/lib/site/render-context";

/** Live block preview in the site editor — matches the public site renderer. */
export function EditorBlockPreview({
  blocks,
  context,
}: {
  blocks: Block[];
  context: RenderContext;
}) {
  const labels = usePublicLabels();
  return <ClientBlockRenderer blocks={blocks} context={context} embedded labels={labels} />;
}
