import { createClient } from "@/lib/supabase/server";
import { requirePortalSession } from "@/lib/portal/session";
import { PrivateClientsManager } from "@/components/portal/teacher/PrivateClientsManager";

export type PrivateClient = {
  id: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  createdAt: string;
};

export default async function PrivateClientsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("private_clients")
    .select("id, full_name, email, phone, notes, created_at")
    .eq("instructor_id", user!.id)
    .order("full_name");

  const clients: PrivateClient[] = (data ?? []).map((c) => ({
    id: c.id,
    fullName: c.full_name,
    email: c.email ?? null,
    phone: c.phone ?? null,
    notes: c.notes ?? null,
    createdAt: c.created_at,
  }));

  return <PrivateClientsManager clients={clients} />;
}
