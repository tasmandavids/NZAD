// ============================================================================
//  components/builder/RichTextView.tsx — read-only rich-text renderer.
//  Maps the RichText run model to elements. Shared by the canvas (non-editing)
//  and the public renderer.
// ============================================================================

import { createElement, type CSSProperties, type ReactNode } from "react";
import type { RichBlock, RichText } from "@/lib/builder/schema";
import { markStyle } from "@/lib/builder/rich";

const TAG_ELEMENT: Record<NonNullable<RichBlock["tag"]>, string> = {
  p: "p",
  h1: "h1",
  h2: "h2",
  h3: "h3",
  h4: "h4",
  li: "li",
  blockquote: "blockquote",
};

function renderRuns(block: RichBlock): ReactNode[] {
  if (block.runs.length === 0) return [createElement("br", { key: 0 })];
  return block.runs.map((run, i) => {
    if (run.text === "\n") return createElement("br", { key: i });
    const style: CSSProperties = markStyle(run.marks);
    if (run.marks?.link) {
      return createElement("a", { key: i, href: run.marks.link, style }, run.text);
    }
    return createElement("span", { key: i, style }, run.text);
  });
}

export function RichTextView({ rich }: { rich: RichText }) {
  return (
    <>
      {rich.map((block, i) =>
        createElement(
          TAG_ELEMENT[block.tag ?? "p"],
          { key: i, style: { margin: 0 } },
          renderRuns(block),
        ),
      )}
    </>
  );
}
