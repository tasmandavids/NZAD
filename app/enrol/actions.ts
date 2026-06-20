"use server";

import { z } from "zod";
import { createPublicClient } from "@/lib/supabase/public";
import { buildTrialLeadNotes, splitParentName } from "@/lib/enrol/trial-request";

export type ActionResult = { ok: true } | { ok: false; error: string };

const TrialRequestSchema = z.object({
  studioId: z.string().uuid(),
  parentName: z.string().min(1, "Name required").max(120),
  email: z.string().email("Invalid email"),
  childName: z.string().max(120).optional().or(z.literal("")),
  phone: z.string().max(30).optional().or(z.literal("")),
  classId: z.string().uuid().optional().or(z.literal("")),
  className: z.string().max(200).optional().or(z.literal("")),
  disciplineKey: z.string().max(40).optional().or(z.literal("")),
  disciplineLabel: z.string().max(80).optional().or(z.literal("")),
});

export async function submitTrialRequest(input: unknown): Promise<ActionResult> {
  const parsed = TrialRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const d = parsed.data;
  const { firstName, lastName } = splitParentName(d.parentName);
  if (!firstName) return { ok: false, error: "Name required" };

  const supabase = createPublicClient();
  const { data: studio } = await supabase
    .from("studios")
    .select("id")
    .eq("id", d.studioId)
    .neq("status", "suspended")
    .maybeSingle();

  if (!studio) return { ok: false, error: "Studio not found" };

  const notes = buildTrialLeadNotes({
    childName: d.childName,
    className: d.className,
    disciplineLabel: d.disciplineLabel,
    phone: d.phone,
  });

  const { error: dbErr } = await supabase.from("leads").insert({
    studio_id: d.studioId,
    first_name: firstName,
    last_name: lastName,
    email: d.email,
    phone: d.phone || null,
    source: "enrol-page",
    status: "trial",
    notes,
  });

  if (dbErr) return { ok: false, error: dbErr.message };
  return { ok: true };
}
