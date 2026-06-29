import { createClient } from "@/lib/supabase/server";
import { AvailabilityManager } from "@/components/portal/teacher/AvailabilityManager";

export type AvailabilitySlot = {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  notes: string | null;
};

export default async function AvailabilityPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("instructor_availability")
    .select("id, day_of_week, start_time, end_time, notes")
    .eq("instructor_id", user!.id)
    .order("day_of_week")
    .order("start_time");

  const slots: AvailabilitySlot[] = (data ?? []).map((r) => ({
    id: r.id,
    dayOfWeek: r.day_of_week,
    startTime: (r.start_time as string).slice(0, 5),
    endTime: (r.end_time as string).slice(0, 5),
    notes: r.notes ?? null,
  }));

  return <AvailabilityManager slots={slots} />;
}
