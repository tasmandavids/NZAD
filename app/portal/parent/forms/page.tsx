import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { FormsVault, type FormField } from "@/components/portal/parent/FormsVault";
import { submitForm } from "./actions";

export default async function FormsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profileData } = await supabase
    .from("profiles")
    .select("studio_id")
    .eq("id", user.id)
    .single();

  const studioId = profileData?.studio_id as string | null;

  const { data: guardianships } = await supabase
    .from("guardianships")
    .select("student_id, profiles!student_id ( full_name )")
    .eq("guardian_id", user.id);

  const children = (guardianships ?? []).map((g) => ({
    studentId: g.student_id as string,
    name: (g.profiles as unknown as { full_name: string | null } | null)?.full_name ?? null,
  }));

  const studentIds = children.map((c) => c.studentId);

  const [formsRes, responsesRes] = await Promise.all([
    studioId
      ? supabase
          .from("student_forms")
          .select("id, title, description, form_type, fields, is_required, due_date")
          .eq("studio_id", studioId)
          .eq("active", true)
          .order("created_at")
      : Promise.resolve({ data: [] }),

    studentIds.length
      ? supabase
          .from("form_responses")
          .select("form_id, student_id, data, signed_at")
          .in("student_id", studentIds)
          .eq("parent_id", user.id)
      : Promise.resolve({ data: [] }),
  ]);

  const VALID_TYPES = ["text", "textarea", "checkbox", "select", "date", "phone", "email"] as const;

  const forms = (formsRes.data ?? []).map((f) => ({
    id: f.id as string,
    title: f.title as string,
    description: (f.description as string | null) ?? null,
    formType: f.form_type as string,
    fields: ((f.fields as unknown as Array<Record<string, unknown>>) ?? []).map((field) => ({
      key: field.key as string,
      label: field.label as string,
      type: VALID_TYPES.includes(field.type as (typeof VALID_TYPES)[number])
        ? (field.type as FormField["type"])
        : ("text" as FormField["type"]),
      required: field.required as boolean | undefined,
      options: field.options as string[] | undefined,
      placeholder: field.placeholder as string | undefined,
    })),
    isRequired: f.is_required as boolean,
    dueDate: (f.due_date as string | null) ?? null,
  }));

  const responses = (responsesRes.data ?? []).map((r) => ({
    formId: r.form_id as string,
    studentId: r.student_id as string,
    studentName: children.find((c) => c.studentId === r.student_id)?.name ?? null,
    data: (r.data as Record<string, unknown>) ?? {},
    signedAt: (r.signed_at as string | null) ?? null,
  }));

  return (
    <FormsVault
      forms={forms}
      dancers={children}
      responses={responses}
      onSubmit={submitForm}
    />
  );
}
