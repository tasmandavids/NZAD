// ============================================================================
//  lib/builder/rich.ts — portable rich-text helpers (pillar 3).
//
//  Text nodes store content as RichText (an array of blocks of styled runs).
//  These helpers convert between that model and the DOM the inline WYSIWYG
//  editor works with, plus produce React style objects for individual marks so
//  per-character color / gradient / letter-spacing are honoured.
// ============================================================================

import type { CSSProperties } from "react";
import type { RichBlock, RichText, TextMark, TextRun } from "./schema";
import { isTokenRef, resolveTokenValue } from "./tokens";

export function plainToRich(text: string, tag: RichBlock["tag"] = "p"): RichText {
  return text
    .split("\n")
    .map((line) => ({ tag, runs: [{ text: line }] as TextRun[] }));
}

export function richToPlain(rich: RichText): string {
  return rich.map((b) => b.runs.map((r) => r.text).join("")).join("\n");
}

/** CSS for a single run's marks (used by both editor and read renderer). */
export function markStyle(mark: TextMark | undefined): CSSProperties {
  if (!mark) return {};
  const css: CSSProperties = {};
  if (mark.bold) css.fontWeight = 700;
  if (mark.fontWeight !== undefined) css.fontWeight = mark.fontWeight as CSSProperties["fontWeight"];
  if (mark.italic) css.fontStyle = "italic";
  if (mark.underline || mark.strike) {
    css.textDecoration = [mark.underline ? "underline" : "", mark.strike ? "line-through" : ""].filter(Boolean).join(" ");
  }
  if (mark.code) {
    css.fontFamily = "var(--ds-font-mono, monospace)";
    css.background = "rgba(0,0,0,0.06)";
    css.padding = "0.1em 0.3em";
    css.borderRadius = "4px";
  }
  if (mark.letterSpacing !== undefined) {
    css.letterSpacing = typeof mark.letterSpacing === "number" ? `${mark.letterSpacing}px` : mark.letterSpacing;
  }
  if (mark.gradient) {
    css.backgroundImage = mark.gradient;
    (css as Record<string, unknown>).WebkitBackgroundClip = "text";
    css.backgroundClip = "text";
    css.color = "transparent";
    (css as Record<string, unknown>).WebkitTextFillColor = "transparent";
  } else if (mark.color) {
    css.color = isTokenRef(mark.color) ? resolveTokenValue(mark.color) : mark.color;
  }
  return css;
}

/** Serialize marks to an inline CSS string (for contenteditable HTML). */
export function markStyleString(mark: TextMark | undefined): string {
  const css = markStyle(mark);
  return Object.entries(css)
    .map(([k, v]) => `${k.replace(/[A-Z]/g, (m) => "-" + m.toLowerCase())}:${v}`)
    .join(";");
}

const BLOCK_TAGS = new Set(["P", "H1", "H2", "H3", "H4", "LI", "BLOCKQUOTE", "DIV"]);

/** Parse a contenteditable element's DOM back into RichText. */
export function domToRich(el: HTMLElement, defaultTag: RichBlock["tag"] = "p"): RichText {
  const blocks: RichBlock[] = [];

  const tagFor = (node: Element): RichBlock["tag"] => {
    const t = node.tagName;
    if (t === "H1") return "h1";
    if (t === "H2") return "h2";
    if (t === "H3") return "h3";
    if (t === "H4") return "h4";
    if (t === "LI") return "li";
    if (t === "BLOCKQUOTE") return "blockquote";
    return defaultTag;
  };

  const collectRuns = (parent: Node, inherited: TextMark): TextRun[] => {
    const runs: TextRun[] = [];
    parent.childNodes.forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = child.textContent ?? "";
        if (text) runs.push({ text, marks: Object.keys(inherited).length ? { ...inherited } : undefined });
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        const elc = child as HTMLElement;
        if (elc.tagName === "BR") {
          runs.push({ text: "\n" });
          return;
        }
        runs.push(...collectRuns(elc, mergeMarks(inherited, elementMarks(elc))));
      }
    });
    return runs;
  };

  const blockChildren = Array.from(el.childNodes).filter(
    (n) => n.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has((n as Element).tagName),
  ) as HTMLElement[];

  if (blockChildren.length === 0) {
    // No block wrappers — treat the whole element as one block.
    blocks.push({ tag: defaultTag, runs: mergeAdjacent(collectRuns(el, {})) });
  } else {
    for (const bc of blockChildren) {
      blocks.push({ tag: tagFor(bc), runs: mergeAdjacent(collectRuns(bc, {})) });
    }
  }
  return blocks.length ? blocks : [{ tag: defaultTag, runs: [{ text: "" }] }];
}

function elementMarks(el: HTMLElement): TextMark {
  const m: TextMark = {};
  const t = el.tagName;
  if (t === "B" || t === "STRONG") m.bold = true;
  if (t === "I" || t === "EM") m.italic = true;
  if (t === "U") m.underline = true;
  if (t === "S" || t === "STRIKE" || t === "DEL") m.strike = true;
  if (t === "CODE") m.code = true;
  if (t === "A") m.link = (el as HTMLAnchorElement).getAttribute("href") ?? undefined;
  const style = el.style;
  if (style.fontWeight && (style.fontWeight === "bold" || Number(style.fontWeight) >= 600)) m.bold = true;
  if (style.fontStyle === "italic") m.italic = true;
  if (style.color) m.color = style.color;
  if (style.letterSpacing) m.letterSpacing = style.letterSpacing;
  if (style.textDecorationLine?.includes("underline") || style.textDecoration?.includes("underline")) m.underline = true;
  return m;
}

function mergeMarks(a: TextMark, b: TextMark): TextMark {
  return { ...a, ...b };
}

/** Collapse consecutive runs with identical marks. */
function mergeAdjacent(runs: TextRun[]): TextRun[] {
  const out: TextRun[] = [];
  for (const run of runs) {
    const last = out[out.length - 1];
    if (last && JSON.stringify(last.marks ?? null) === JSON.stringify(run.marks ?? null)) {
      last.text += run.text;
    } else {
      out.push({ ...run });
    }
  }
  return out;
}
