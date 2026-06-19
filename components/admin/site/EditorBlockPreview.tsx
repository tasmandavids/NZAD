"use client";

import { BLOCK_MAP, type Block } from "@/lib/site/blocks";
import { str, list } from "@/lib/site/props";
import { typographyClasses } from "@/lib/site/block-styles";
import type { RenderContext } from "@/lib/site/render-context";

/** Lightweight client block preview for the site editor (avoids importing BlockRenderer). */
export function EditorBlockPreview({
  blocks,
  context,
}: {
  blocks: Block[];
  context: RenderContext;
}) {
  return (
    <>
      {blocks.map((block) => (
        <PreviewBlock key={block.id} block={block} context={context} />
      ))}
    </>
  );
}

function PreviewBlock({ block, context }: { block: Block; context: RenderContext }) {
  const meta = BLOCK_MAP[block.type];
  const p = block.props;

  switch (block.type) {
    case "heading":
    case "pageHeader":
      return (
        <div className={`px-6 py-8 ${typographyClasses(p)}`}>
          <h2 className="text-3xl font-semibold text-ink">{str(p, "text", meta.label)}</h2>
        </div>
      );
    case "paragraph":
    case "richText":
      return (
        <div className={`px-6 py-4 text-ink/90 ${typographyClasses(p)}`}>
          <p>{str(p, "text", "Add your copy here.")}</p>
        </div>
      );
    case "classGrid":
      return (
        <div className="px-6 py-8">
          <h3 className="mb-4 text-xl font-semibold text-ink">{str(p, "title", "Classes")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {context.classes.slice(0, 3).map((c) => (
              <div key={c.id} className="rounded-xl border border-[--hair] bg-surface p-4">
                <p className="font-medium text-ink">{c.name}</p>
                <p className="text-sm text-muted">{c.discipline}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "shopGrid":
      return (
        <div className="px-6 py-8">
          <h3 className="mb-4 text-xl font-semibold text-ink">{str(p, "title", "Shop")}</h3>
          <div className="grid gap-3 sm:grid-cols-2">
            {context.products.slice(0, 2).map((pr) => (
              <div key={pr.id} className="rounded-xl border border-[--hair] bg-surface p-4">
                <p className="font-medium text-ink">{pr.name}</p>
              </div>
            ))}
          </div>
        </div>
      );
    case "features":
      return (
        <div className="grid gap-4 px-6 py-8 sm:grid-cols-3">
          {list(p, "items").slice(0, 3).map((item, i) => (
            <div key={i} className="rounded-xl border border-[--hair] bg-surface p-4">
              <p className="font-medium text-ink">{str(item, "title", "Feature")}</p>
              <p className="mt-1 text-sm text-muted">{str(item, "body", "")}</p>
            </div>
          ))}
        </div>
      );
    case "spacer":
      return <div style={{ height: Number(p.height) || 48 }} aria-hidden />;
    case "divider":
      return <hr className="mx-6 border-[--hair]" />;
    default:
      return (
        <div className="border border-dashed border-[--hair] bg-surface/50 px-6 py-10 text-center text-sm text-muted">
          {meta?.label ?? block.type} preview
        </div>
      );
  }
}
