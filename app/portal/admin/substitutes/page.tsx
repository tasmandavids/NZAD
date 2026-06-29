import { requirePortalSession } from "@/lib/portal/session";
import { SubstituteBoardAdmin } from "@/components/admin/substitutes/SubstituteBoardAdmin";

export type AdminSubRequest = {
  id: string;
  className: string;
  classId: string | null;
  discipline: string | null;
  date: string;
  startTime: string;
  endTime: string;
  notes: string | null;
  status: "open" | "filled" | "cancelled";
  postedByName: string | null;
  filledByName: string | null;
};

export type ClassOption = { id: string; name: string; discipline: string | null; startTime: string | null };

export default async function AdminSubstitutesPage() {
  const { supabase, studioId } = await requirePortalSession();

  const [requestsRes, classesRes] = await Promise.all([
    supabase
      .from("substitute_requests")
      .select(`
        id, class_id, class_name, discipline, date, start_time, end_time, notes, status,
        poster:profiles!posted_by ( full_name ),
        filler:profiles!filled_by ( full_name )
      `)
      .eq("studio_id", studioId)
      .order("date", { ascending: false })
      .limit(100),

    supabase
      .from("classes")
      .select("id, name, discipline, start_time")
      .eq("studio_id", studioId)
      .order("name"),
  ]);

  const requests: AdminSubRequest[] = (requestsRes.data ?? []).map((r) => {
    const poster = r.poster as unknown as { full_name: string | null } | null;
    const filler = r.filler as unknown as { full_name: string | null } | null;
    return {
      id: r.id,
      className: r.class_name,
      classId: r.class_id ?? null,
      discipline: r.discipline ?? null,
      date: r.date,
      startTime: (r.start_time as string).slice(0, 5),
      endTime: (r.end_time as string).slice(0, 5),
      notes: r.notes ?? null,
      status: r.status as AdminSubRequest["status"],
      postedByName: poster?.full_name ?? null,
      filledByName: filler?.full_name ?? null,
    };
  });

  const classOptions: ClassOption[] = (classesRes.data ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    discipline: c.discipline ?? null,
    startTime: c.start_time ? (c.start_time as string).slice(0, 5) : null,
  }));

  return <SubstituteBoardAdmin requests={requests} classOptions={classOptions} />;
}
