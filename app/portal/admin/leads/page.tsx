// ============================================================================
//  /portal/admin/leads — CRM pipeline (server component).
// ============================================================================

import { createClient } from "@/lib/supabase/server";
import { LeadsBoard } from "@/components/admin/leads/LeadsBoard";

export type Lead = {
  id: string;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  source: string | null;
  status: "new" | "contacted" | "trial" | "converted" | "lost";
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

async function currentStudioId(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user!.id)
    .single();
  return data?.studio_id as string;
}

export default async function LeadsPage() {
  const supabase = await createClient();
  const studioId = await currentStudioId(supabase);

  const { data } = await supabase
    .from("leads")
    .select("id, first_name, last_name, email, phone, source, status, notes, created_at, updated_at")
    .eq("studio_id", studioId)
    .order("updated_at", { ascending: false });

  const leads: Lead[] = (data ?? []).map((r) => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    phone: r.phone,
    source: r.source,
    status: r.status as Lead["status"],
    notes: r.notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }));

  return <LeadsBoard initialLeads={leads} />;
}
