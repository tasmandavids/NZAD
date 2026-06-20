"use server";

// ============================================================================
//  Leads CRM server actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getStudioOpsStudio } from "@/lib/portal/access";
import { getTranslations } from "@/lib/i18n/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type LeadStatus = "new" | "contacted" | "trial" | "converted" | "lost";

const VALID_STATUSES: LeadStatus[] = ["new", "contacted", "trial", "converted", "lost"];

async function getAdminStudio() {
  const ctx = await getStudioOpsStudio();
  return {
    error: ctx.error,
    supabase: ctx.supabase,
    studioId: ctx.studioId,
  };
}

export type LeadFormData = {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  source?: string;
  notes?: string;
};

export async function createLead(input: unknown): Promise<ActionResult> {
  const t = await getTranslations("errors.actions");
  const LeadSchema = z.object({
    firstName: z.string().min(1, t("firstNameRequired")).max(100),
    lastName: z.string().max(100).optional().or(z.literal("")),
    email: z.string().email(t("invalidEmail")).optional().or(z.literal("")),
    phone: z.string().max(30).optional().or(z.literal("")),
    source: z.string().max(60).optional().or(z.literal("")),
    notes: z.string().max(2000).optional().or(z.literal("")),
  });

  const parsed = LeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? t("invalidInput") };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const d = parsed.data;
  const { error: dbErr } = await supabase.from("leads").insert({
    studio_id: studioId,
    first_name: d.firstName,
    last_name: d.lastName || null,
    email: d.email || null,
    phone: d.phone || null,
    source: d.source || null,
    notes: d.notes || null,
    status: "new",
  });

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  const t = await getTranslations("errors.actions");
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: t("invalidStatus") };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const { error: dbErr } = await supabase
    .from("leads")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", leadId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}

export async function updateLeadNotes(
  leadId: string,
  notes: string,
): Promise<ActionResult> {
  const t = await getTranslations("errors.actions");
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const { error: dbErr } = await supabase
    .from("leads")
    .update({ notes })
    .eq("id", leadId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}

export async function deleteLead(leadId: string): Promise<ActionResult> {
  const t = await getTranslations("errors.actions");
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? t("unknown") };

  const { error: dbErr } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}
