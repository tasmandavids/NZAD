// ============================================================================
//  lib/site/props.ts — typed accessors for loosely-stored block props.
//  Block components read props through these so we never sprinkle `any`.
// ============================================================================

import type { BlockProps, BlockItem } from "./blocks";

export function str(props: BlockProps, key: string, fallback = ""): string {
  const v = props[key];
  return typeof v === "string" ? v : fallback;
}

export function num(props: BlockProps, key: string, fallback = 0): number {
  const v = props[key];
  if (typeof v === "number") return v;
  if (typeof v === "string" && v.trim() !== "" && !Number.isNaN(Number(v))) return Number(v);
  return fallback;
}

export function bool(props: BlockProps, key: string, fallback = false): boolean {
  const v = props[key];
  return typeof v === "boolean" ? v : fallback;
}

export function list(props: BlockProps, key: string): BlockItem[] {
  const v = props[key];
  return Array.isArray(v) ? v : [];
}
