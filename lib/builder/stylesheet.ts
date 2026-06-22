// ============================================================================
//  lib/builder/stylesheet.ts — compile a BuilderDocument into a real CSS string.
//
//  The editor canvas resolves each node's style inline at the ONE active
//  breakpoint (see NodeRenderer). That is wrong for published output: a real
//  visitor on a phone must get the mobile overrides, a tablet the tablet ones,
//  etc. So for the published/SSR render we instead emit a stylesheet:
//
//    • one base rule `.b-<id>{…}` per node (the base-breakpoint resolved style),
//    • one `@media` block per breakpoint carrying only the DIFF vs the adjacent
//      band, ordered so the active band wins,
//    • `:hover/:active/:focus` rules from `node.states`.
//
//  Each band's declarations come straight from the same `cascadeStyle` +
//  `compileStyle` the canvas uses, so published output matches the editor at
//  every breakpoint. Diffing against the adjacent band keeps the CSS minimal and
//  sidesteps the transform-composition trap (translate+rotate+scale collapse to a
//  single `transform`): we emit each band's fully-resolved value, never a partial.
// ============================================================================

import type { CSSProperties } from "react";
import {
  BREAKPOINTS,
  type BreakpointId,
  type BuilderDocument,
  type BuilderNode,
  type InteractionState,
  type NodeId,
} from "./schema";
import { cascadeStyle, compileStyle } from "./cascade";

const STATES: InteractionState[] = ["hover", "active", "focus"];

/** Stable per-node class used by the published renderer. */
export function nodeClassName(id: NodeId): string {
  return `b-${id}`;
}

interface Band {
  bp: BreakpointId;
  media: string;
}

function bpById(id: BreakpointId) {
  return BREAKPOINTS.find((b) => b.id === id)!;
}

/** The base layer and the override bands, in source order (later band wins). */
function bandsFor(cascade: BuilderDocument["cascade"]): { base: BreakpointId; bands: Band[] } {
  if (cascade === "mobile-first") {
    // Narrowest is the base; widen via min-width (wider bands come later → win).
    return {
      base: "mobileP",
      bands: [
        { bp: "mobileL", media: `(min-width:${bpById("mobileP").maxWidth! + 1}px)` },
        { bp: "tablet", media: `(min-width:${bpById("mobileL").maxWidth! + 1}px)` },
        { bp: "desktop", media: `(min-width:${bpById("tablet").maxWidth! + 1}px)` },
      ],
    };
  }
  // Desktop-first (default): desktop is the base; narrow via max-width (narrower
  // bands come later → win).
  return {
    base: "desktop",
    bands: [
      { bp: "tablet", media: `(max-width:${bpById("tablet").maxWidth}px)` },
      { bp: "mobileL", media: `(max-width:${bpById("mobileL").maxWidth}px)` },
      { bp: "mobileP", media: `(max-width:${bpById("mobileP").maxWidth}px)` },
    ],
  };
}

function camelToKebab(key: string): string {
  // `backdropFilter` → `backdrop-filter`; `WebkitTextFillColor` →
  // `-webkit-text-fill-color` (the leading W becomes `-w`).
  return key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

function cssValue(v: unknown): string | null {
  if (v === undefined || v === null || v === "") return null;
  return typeof v === "number" ? String(v) : String(v);
}

/** Serialize a full CSSProperties object to `a:b;c:d`. */
function declarations(css: CSSProperties): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(css)) {
    const val = cssValue(v);
    if (val !== null) out.push(`${camelToKebab(k)}:${val}`);
  }
  return out.join(";");
}

/** Only the properties of `b` whose serialized value differs from `a`. */
function diffDeclarations(a: CSSProperties, b: CSSProperties): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(b)) {
    const val = cssValue(v);
    if (val === null) continue;
    if (cssValue((a as Record<string, unknown>)[k]) === val) continue;
    out.push(`${camelToKebab(k)}:${val}`);
  }
  return out.join(";");
}

function resolved(node: BuilderNode, bp: BreakpointId, cascade: BuilderDocument["cascade"], state?: InteractionState): CSSProperties {
  return compileStyle(cascadeStyle(node, { breakpoint: bp, cascade, state }), node);
}

/**
 * Build the full stylesheet for a document. Class names are the node ids
 * (globally unique within a document), so a plain global `<style>` is safe.
 */
export function buildDocumentStylesheet(doc: BuilderDocument): string {
  const { base, bands } = bandsFor(doc.cascade);
  const baseRules: string[] = [];
  const mediaBuckets = new Map<string, string[]>();

  for (const node of Object.values(doc.nodes)) {
    const sel = `.${nodeClassName(node.id)}`;
    const baseCss = resolved(node, base, doc.cascade);

    const baseDecl = declarations(baseCss);
    if (baseDecl) baseRules.push(`${sel}{${baseDecl}}`);

    // Interaction states layer on top of the base.
    for (const st of STATES) {
      if (!node.states?.[st]) continue;
      const diff = diffDeclarations(baseCss, resolved(node, base, doc.cascade, st));
      if (diff) baseRules.push(`${sel}:${st}{${diff}}`);
    }

    // Each breakpoint band carries only what changed vs the adjacent band.
    let prevCss = baseCss;
    for (const band of bands) {
      const bandCss = resolved(node, band.bp, doc.cascade);
      const diff = diffDeclarations(prevCss, bandCss);
      if (diff) {
        const arr = mediaBuckets.get(band.media) ?? [];
        arr.push(`${sel}{${diff}}`);
        mediaBuckets.set(band.media, arr);
      }
      prevCss = bandCss;
    }
  }

  const out = [baseRules.join("")];
  for (const band of bands) {
    const rules = mediaBuckets.get(band.media);
    if (rules?.length) out.push(`@media ${band.media}{${rules.join("")}}`);
  }
  return out.join("");
}
