// ============================================================================
//  lib/discounts.ts   (Phase 3.3 — shared sibling / family discount)
//
//  Single source of truth for the sibling-discount calculation, used by both
//  one-off enrollment PaymentIntents (createEnrollmentIntent) and recurring
//  auto-pay subscriptions (createEnrollmentSubscription).
//
//  Rule: if the studio has a sibling_discount_pct > 0 AND the paying guardian
//  already has at least one OTHER student with an `active` enrollment, the
//  percentage is applied to the charge.
// ============================================================================

import type { SupabaseClient } from "@supabase/supabase-js";

export type SiblingDiscount = {
  /** True when the family qualifies and the studio has a non-zero discount. */
  applies: boolean;
  /** Whole-number percentage configured by the studio (0 if disabled). */
  pct: number;
  /** Charge amount in cents after the discount (== priceCents if not applied). */
  discountedCents: number;
};

/**
 * Resolves the studio's sibling discount for a given enrollment. The discount
 * applies when the studio has a sibling_discount_pct > 0 AND the paying
 * guardian already has at least one OTHER student with an `active` enrollment.
 */
export async function siblingDiscountInfo(
  supabase: SupabaseClient,
  studioId: string,
  guardianId: string,
  studentId: string,
  priceCents: number,
): Promise<SiblingDiscount> {
  const none: SiblingDiscount = { applies: false, pct: 0, discountedCents: priceCents };
  if (priceCents <= 0) return none;

  const { data: studio } = await supabase
    .from("studios")
    .select("sibling_discount_pct")
    .eq("id", studioId)
    .single();

  const pct = Number(studio?.sibling_discount_pct ?? 0);
  if (pct <= 0) return none;

  // Other students this guardian is responsible for.
  const { data: siblings } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("guardian_id", guardianId)
    .neq("student_id", studentId);

  const siblingIds = (siblings ?? []).map((s) => s.student_id as string);
  if (siblingIds.length === 0) return none;

  // Does at least one sibling already have an active enrollment?
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .in("student_id", siblingIds)
    .eq("status", "active");

  if ((count ?? 0) > 0) {
    return {
      applies: true,
      pct,
      discountedCents: Math.round((priceCents * (100 - pct)) / 100),
    };
  }
  return none;
}

/**
 * Family discount for NON-enrollment retail purchases (shop orders, event
 * tickets). Unlike `siblingDiscountInfo` these purchases aren't tied to a
 * specific student, so the rule is:
 *
 *   • the studio has OPTED IN via `family_discount_on_retail = true`, AND
 *   • the studio has a `sibling_discount_pct > 0`, AND
 *   • the buyer already has >=1 student with an `active` enrollment.
 *
 * Returns the same shape as `siblingDiscountInfo`.
 */
export async function familyDiscountInfo(
  supabase: SupabaseClient,
  studioId: string,
  buyerId: string,
  priceCents: number,
): Promise<SiblingDiscount> {
  const none: SiblingDiscount = { applies: false, pct: 0, discountedCents: priceCents };
  if (priceCents <= 0) return none;

  const { data: studio } = await supabase
    .from("studios")
    .select("sibling_discount_pct, family_discount_on_retail")
    .eq("id", studioId)
    .single();

  if (!studio?.family_discount_on_retail) return none;

  const pct = Number(studio?.sibling_discount_pct ?? 0);
  if (pct <= 0) return none;

  // Students this buyer is a guardian of.
  const { data: kids } = await supabase
    .from("guardianships")
    .select("student_id")
    .eq("guardian_id", buyerId);

  const studentIds = (kids ?? []).map((k) => k.student_id as string);
  if (studentIds.length === 0) return none;

  // Does at least one of them currently have an active enrollment?
  const { count } = await supabase
    .from("enrollments")
    .select("id", { count: "exact", head: true })
    .in("student_id", studentIds)
    .eq("status", "active");

  if ((count ?? 0) > 0) {
    return {
      applies: true,
      pct,
      discountedCents: Math.round((priceCents * (100 - pct)) / 100),
    };
  }
  return none;
}

/**
 * Convenience wrapper returning only the discounted charge in cents.
 */
export async function siblingDiscountedCents(
  supabase: SupabaseClient,
  studioId: string,
  guardianId: string,
  studentId: string,
  priceCents: number,
): Promise<number> {
  const info = await siblingDiscountInfo(supabase, studioId, guardianId, studentId, priceCents);
  return info.discountedCents;
}
