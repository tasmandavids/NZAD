// ============================================================================
//  /portal/admin/parents/[id] — Parent profile with family, billing, messages.
// ============================================================================

import { notFound } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import { listStudioMemberProfileIds } from "@/lib/portal/studio-members";
import ParentDetailHub from "@/components/admin/parents/ParentDetailHub";
import type {
  GuardianRelationship,
  ParentDetail,
  ParentInvoice,
  ParentOrder,
  ParentPayment,
  StudentOption,
} from "@/lib/parents/types";

export default async function ParentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, studioId, userId } = await requirePortalSession();
  if (!studioId) notFound();

  const [parentIds, studentIds] = await Promise.all([
    listStudioMemberProfileIds(supabase, studioId, "parent"),
    listStudioMemberProfileIds(supabase, studioId, "student"),
  ]);

  if (!parentIds.includes(id)) notFound();

  const [
    parentRes,
    guardianshipsRes,
    studentsRes,
    invoicesRes,
    paymentsRes,
    ordersRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, created_at")
      .eq("id", id)
      .eq("role", "parent")
      .single(),

    supabase
      .from("guardianships")
      .select(`
        guardian_id, student_id, is_primary, relationship,
        profiles!guardian_id ( id, full_name, email, phone )
      `)
      .eq("studio_id", studioId),

    studentIds.length === 0
      ? Promise.resolve({ data: [] as never[] })
      : supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", studentIds)
          .eq("role", "student")
          .order("full_name"),

    supabase
      .from("invoices")
      .select(`
        id, invoice_number, amount_cents, status, due_date, issued_at, paid_at,
        student:profiles!invoices_student_id_fkey ( full_name )
      `)
      .eq("studio_id", studioId)
      .eq("payer_id", id)
      .order("issued_at", { ascending: false }),

    supabase
      .from("payments")
      .select("id, amount_cents, currency, status, created_at, invoice_id, stripe_payment_intent_id, invoices(invoice_number)")
      .eq("studio_id", studioId)
      .eq("payer_id", id)
      .eq("status", "succeeded")
      .order("created_at", { ascending: false }),

    supabase
      .from("orders")
      .select("id, total_cents, status, created_at")
      .eq("studio_id", studioId)
      .eq("user_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (parentRes.error || !parentRes.data) notFound();

  const p = parentRes.data;
  const allGuardianships = guardianshipsRes.data ?? [];

  const myLinks = allGuardianships.filter((g) => g.guardian_id === id);
  const myStudentIds = new Set(myLinks.map((g) => g.student_id));

  const studentNameMap = new Map(
    (studentsRes.data ?? []).map((s) => [s.id, s.full_name as string | null]),
  );

  const children = myLinks.map((g) => ({
    id: g.student_id as string,
    name: studentNameMap.get(g.student_id as string) ?? null,
    relationship: (g.relationship ?? "guardian") as GuardianRelationship,
    isPrimary: g.is_primary as boolean,
  }));

  const coParentMap = new Map<string, { id: string; name: string | null; email: string | null; phone: string | null }>();
  for (const g of allGuardianships) {
    if (g.guardian_id === id) continue;
    if (!myStudentIds.has(g.student_id as string)) continue;
    const prof = g.profiles as unknown as {
      id: string;
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
    if (!prof) continue;
    coParentMap.set(prof.id, {
      id: prof.id,
      name: prof.full_name,
      email: prof.email,
      phone: prof.phone,
    });
  }

  const parent: ParentDetail = {
    id: p.id,
    name: p.full_name,
    email: p.email,
    phone: p.phone,
    createdAt: p.created_at,
    children,
    coParents: [...coParentMap.values()],
    isPrimaryContact: myLinks.some((g) => g.is_primary),
  };

  const students: StudentOption[] = (studentsRes.data ?? []).map((s) => ({
    id: s.id,
    name: s.full_name,
  }));

  const invoices: ParentInvoice[] = (invoicesRes.data ?? []).map((inv) => {
    const student = inv.student as unknown as { full_name: string | null } | null;
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number as number,
      amountCents: inv.amount_cents as number,
      status: inv.status as string,
      dueDate: inv.due_date as string | null,
      issuedAt: inv.issued_at as string | null,
      paidAt: inv.paid_at as string | null,
      studentName: student?.full_name ?? null,
    };
  });

  const payments: ParentPayment[] = (paymentsRes.data ?? []).map((pay) => {
    const invoice = pay.invoices as unknown as { invoice_number: number } | null;
    return {
      id: pay.id,
      amountCents: pay.amount_cents as number,
      currency: pay.currency as string,
      status: pay.status as string,
      createdAt: pay.created_at as string,
      invoiceId: pay.invoice_id as string | null,
      invoiceNumber: invoice?.invoice_number ?? null,
      stripePaymentIntentId: pay.stripe_payment_intent_id as string | null,
    };
  });

  const orders: ParentOrder[] = (ordersRes.data ?? []).map((o) => ({
    id: o.id,
    totalCents: o.total_cents as number,
    status: o.status as string,
    createdAt: o.created_at as string,
  }));

  return (
    <ParentDetailHub
      parent={parent}
      students={students}
      invoices={invoices}
      payments={payments}
      orders={orders}
      currentUserId={userId}
    />
  );
}
