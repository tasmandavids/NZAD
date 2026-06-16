"use server";

// ============================================================================
//  Leads CRM server actions
// ============================================================================

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type ActionResult = { ok: true } | { ok: false; error: string };
export type LeadStatus = "new" | "contacted" | "trial" | "converted" | "lost";

const VALID_STATUSES: LeadStatus[] = ["new", "contacted", "trial", "converted", "lost"];

async function getAdminStudio() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not signed in.", supabase, studioId: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("studio_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") return { error: "Admin only.", supabase, studioId: null };
  if (!profile.studio_id) return { error: "No studio.", supabase, studioId: null };

  return { error: null, supabase, studioId: profile.studio_id as string };
}

const LeadSchema = z.object({
  firstName: z.string().min(1, "First name required").max(100),
  lastName:  z.string().max(100).optional().or(z.literal("")),
  email:     z.string().email("Invalid email").optional().or(z.literal("")),
  phone:     z.string().max(30).optional().or(z.literal("")),
  source:    z.string().max(60).optional().or(z.literal("")),
  notes:     z.string().max(2000).optional().or(z.literal("")),
});

export type LeadFormData = z.infer<typeof LeadSchema>;

export async function createLead(input: unknown): Promise<ActionResult> {
  const parsed = LeadSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const d = parsed.data;
  const { error: dbErr } = await supabase.from("leads").insert({
    studio_id:  studioId,
    first_name: d.firstName,
    last_name:  d.lastName || null,
    email:      d.email || null,
    phone:      d.phone || null,
    source:     d.source || null,
    notes:      d.notes || null,
    status:     "new",
  });

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}

export async function updateLeadStatus(
  leadId: string,
  status: LeadStatus,
): Promise<ActionResult> {
  if (!VALID_STATUSES.includes(status)) return { ok: false, error: "Invalid status" };

  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

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
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

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
  const { error, supabase, studioId } = await getAdminStudio();
  if (error || !studioId) return { ok: false, error: error ?? "Unknown" };

  const { error: dbErr } = await supabase
    .from("leads")
    .delete()
    .eq("id", leadId)
    .eq("studio_id", studioId);

  if (dbErr) return { ok: false, error: dbErr.message };
  revalidatePath("/portal/admin/leads");
  return { ok: true };
}
