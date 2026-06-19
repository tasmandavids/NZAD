// ============================================================================
//  /portal/admin/staff/[id] — Staff member detail hub.
// ============================================================================

import { notFound, redirect } from "next/navigation";
import { requirePortalSession } from "@/lib/portal/session";
import { getBrandingCached } from "@/lib/branding";
import StaffDetailHub from "@/components/admin/staff/StaffDetailHub";
import type { StaffDetail, StaffOption, StaffPortalRole, StaffShift } from "@/lib/staff/types";

type StaffMemberRow = {
  employment_type: string | null;
  work_location: string | null;
  location_names: string[] | null;
  schedule_notes: string | null;
  contract_notes: string | null;
  pay_notes: string | null;
  manager_id: string | null;
  start_date: string | null;
  end_date: string | null;
  active: boolean | null;
};

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, studioId, role } = await requirePortalSession();
  if (role !== "admin") redirect("/portal/office");
  if (!studioId) notFound();

  const [profileRes, shiftsRes, allStaffRes, branding] = await Promise.all([
    supabase
      .from("profiles")
      .select(`
        id, full_name, email, phone, role, created_at,
        staff_members (
          employment_type, work_location, location_names, schedule_notes,
          contract_notes, pay_notes, manager_id, start_date, end_date, active
        )
      `)
      .eq("id", id)
      .eq("studio_id", studioId)
      .in("role", ["teacher", "office"])
      .single(),

    supabase
      .from("staff_shifts")
      .select("id, staff_id, shift_date, start_time, end_time, location_name, notes")
      .eq("studio_id", studioId)
      .eq("staff_id", id)
      .order("shift_date", { ascending: false })
      .limit(50),

    supabase
      .from("profiles")
      .select("id, full_name, role")
      .eq("studio_id", studioId)
      .in("role", ["teacher", "office", "admin"])
      .order("full_name"),

    getBrandingCached(studioId),
  ]);

  if (profileRes.error || !profileRes.data) notFound();

  const p = profileRes.data;
  const sm = p.staff_members as StaffMemberRow | StaffMemberRow[] | null;
  const member = Array.isArray(sm) ? sm[0] : sm;
  const managerId = member?.manager_id ?? null;

  let managerName: string | null = null;
  if (managerId) {
    const { data: mgr } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", managerId)
      .single();
    managerName = (mgr?.full_name as string | null) ?? null;
  }

  const staffMember: StaffDetail = {
    id: p.id,
    name: p.full_name as string | null,
    email: p.email as string | null,
    phone: p.phone as string | null,
    role: p.role as StaffPortalRole,
    employmentType: (member?.employment_type as StaffDetail["employmentType"]) ?? null,
    workLocation: (member?.work_location as StaffDetail["workLocation"]) ?? null,
    locationNames: member?.location_names ?? [],
    scheduleNotes: member?.schedule_notes ?? null,
    contractNotes: member?.contract_notes ?? null,
    payNotes: member?.pay_notes ?? null,
    managerId,
    managerName,
    startDate: member?.start_date ?? null,
    endDate: member?.end_date ?? null,
    active: member?.active ?? true,
    createdAt: p.created_at as string,
  };

  const shifts: StaffShift[] = (shiftsRes.data ?? []).map((s) => ({
    id: s.id,
    staffId: s.staff_id as string,
    staffName: staffMember.name,
    staffRole: staffMember.role,
    shiftDate: s.shift_date as string,
    startTime: (s.start_time as string).slice(0, 5),
    endTime: (s.end_time as string).slice(0, 5),
    locationName: s.location_name as string | null,
    notes: s.notes as string | null,
  }));

  const managerOptions: StaffOption[] = (allStaffRes.data ?? [])
    .filter((s) => s.id !== id)
    .map((s) => ({
      id: s.id,
      name: s.full_name as string | null,
      role: s.role as StaffOption["role"],
    }));

  const locations = (branding?.siteSettings?.locations ?? []).map((l) => l.name);

  return (
    <StaffDetailHub
      staff={staffMember}
      shifts={shifts}
      managerOptions={managerOptions}
      locations={locations}
    />
  );
}
