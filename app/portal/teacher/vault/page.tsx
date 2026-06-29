import { createClient } from "@/lib/supabase/server";
import { ComplianceVault } from "@/components/portal/teacher/ComplianceVault";

export type InstructorDocument = {
  id: string;
  title: string;
  docType: string;
  issuer: string | null;
  issuedDate: string | null;
  expiryDate: string | null;
  fileUrl: string | null;
  notes: string | null;
  createdAt: string;
};

export default async function VaultPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("instructor_documents")
    .select("id, title, doc_type, issuer, issued_date, expiry_date, file_url, notes, created_at")
    .eq("instructor_id", user!.id)
    .order("expiry_date", { ascending: true, nullsFirst: false });

  const docs: InstructorDocument[] = (data ?? []).map((d) => ({
    id: d.id,
    title: d.title,
    docType: d.doc_type,
    issuer: d.issuer ?? null,
    issuedDate: d.issued_date ?? null,
    expiryDate: d.expiry_date ?? null,
    fileUrl: d.file_url ?? null,
    notes: d.notes ?? null,
    createdAt: d.created_at,
  }));

  return <ComplianceVault documents={docs} />;
}
