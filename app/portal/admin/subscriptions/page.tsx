// ============================================================================
//  /portal/admin/subscriptions — auto-pay subscription oversight (Phase 3.2)
//  Server component: lists every subscription in the studio with payer /
//  student / class names, status, amount, and next charge date.
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import SubscriptionsManager from "@/components/admin/subscriptions/SubscriptionsManager";

export type SubscriptionRow = {
  id: string;
  stripeSubscriptionId: string | null;
  planLabel: string | null;
  amountCents: number;
  interval: string;
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  payerName: string | null;
  studentName: string | null;
  className: string | null;
};

async function getStudioId(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();
  return (data?.studio_id as string) ?? null;
}

export default async function SubscriptionsPage() {
  const supabase = await createClient();
  const studioId = await getStudioId(supabase);

  const { data: subs } = await supabase
    .from("subscriptions")
    .select(
      "id, stripe_subscription_id, plan_label, amount_cents, interval, status, current_period_end, cancel_at_period_end, payer_id, student_id, class_id",
    )
    .eq("studio_id", studioId ?? "")
    .order("created_at", { ascending: false });

  // Resolve names via lookup maps (two FKs to profiles → avoid ambiguous joins).
  const profileIds = [
    ...new Set(
      (subs ?? [])
        .flatMap((s) => [s.payer_id, s.student_id])
        .filter(Boolean) as string[],
    ),
  ];
  const classIds = [
    ...new Set((subs ?? []).map((s) => s.class_id).filter(Boolean) as string[]),
  ];

  const nameMap = new Map<string, string>();
  if (profileIds.length) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", profileIds);
    (data ?? []).forEach((p) => p.full_name && nameMap.set(p.id, p.full_name));
  }

  const classMap = new Map<string, string>();
  if (classIds.length) {
    const { data } = await supabase.from("classes").select("id, name").in("id", classIds);
    (data ?? []).forEach((c) => classMap.set(c.id, c.name));
  }

  const rows: SubscriptionRow[] = (subs ?? []).map((s) => ({
    id:                  s.id as string,
    stripeSubscriptionId: s.stripe_subscription_id as string | null,
    planLabel:           s.plan_label as string | null,
    amountCents:         Number(s.amount_cents ?? 0),
    interval:            (s.interval as string) ?? "month",
    status:              (s.status as string) ?? "incomplete",
    currentPeriodEnd:    s.current_period_end as string | null,
    cancelAtPeriodEnd:   Boolean(s.cancel_at_period_end),
    payerName:           s.payer_id ? nameMap.get(s.payer_id as string) ?? null : null,
    studentName:         s.student_id ? nameMap.get(s.student_id as string) ?? null : null,
    className:           s.class_id ? classMap.get(s.class_id as string) ?? null : null,
  }));

  return <SubscriptionsManager subscriptions={rows} />;
}
