import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  certificatePdfFilename,
  generateCertificatePdf,
} from "@/lib/certificates/generate-certificate-pdf";
import { isUuid } from "@/lib/validation/uuid";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const progressId = req.nextUrl.searchParams.get("progressId");
  const title = req.nextUrl.searchParams.get("title")?.trim();

  if (!progressId || !isUuid(progressId) || !title) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data: row } = await supabase
    .from("student_progress")
    .select(
      `
      id, student_id, certifications, logged_at,
      instructor:profiles!instructor_id ( full_name ),
      student:profiles!student_id ( full_name, studio_id ),
      studio:studios!studio_id ( name )
    `,
    )
    .eq("id", progressId)
    .maybeSingle();

  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const certs = ((row.certifications as string[] | null) ?? []) as string[];
  if (!certs.includes(title)) {
    return NextResponse.json({ error: "Certificate not found" }, { status: 404 });
  }

  const student = row.student as unknown as { full_name: string | null; studio_id: string } | null;
  const studio = row.studio as unknown as { name: string } | null;
  const instructor = row.instructor as unknown as { full_name: string | null } | null;

  const pdf = await generateCertificatePdf({
    studioName: studio?.name ?? "Dance Studio",
    studentName: student?.full_name ?? "Student",
    certificateTitle: title,
    awardedAt: row.logged_at as string,
    instructorName: instructor?.full_name,
  });

  const filename = certificatePdfFilename(student?.full_name ?? "student", title);

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
