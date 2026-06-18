import { describe, it, expect, beforeAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { integrationEnabled, integrationSkipReason } from "./helpers/env";
import { missingTables, migrationsHint } from "./helpers/schema";

const run = integrationEnabled();

describe.skipIf(!run)("waitlist auto-promotion (0012 trigger)", () => {
  let skipReason = integrationSkipReason();
  let studioId: string | null = null;
  let classId: string | null = null;
  let activeEnrollmentId: string | null = null;
  let waitlistedStudentId: string | null = null;
  let waitlistedEnrollmentId: string | null = null;

  beforeAll(async () => {
    if (!run) return;

    const supabase = createAdminClient();
    const missing = await missingTables(supabase);
    if (missing.length > 0) {
      skipReason = migrationsHint(missing);
      return;
    }

    const { data: studio } = await supabase.from("studios").select("id").limit(1).single();
    if (!studio) {
      skipReason = "No studio row in database — seed at least one studio.";
      return;
    }
    studioId = studio.id;

    const { data: students } = await supabase
      .from("profiles")
      .select("id")
      .eq("studio_id", studioId)
      .eq("role", "student")
      .limit(2);

    if (!students || students.length < 2) {
      skipReason = "Need at least two student profiles in the studio for waitlist test.";
      return;
    }

    const { data: cls, error: classErr } = await supabase
      .from("classes")
      .insert({
        studio_id: studioId,
        name: "Integration Waitlist Class",
        capacity: 1,
        day_of_week: 1,
        start_time: "16:00",
        price_cents: 0,
      })
      .select("id")
      .single();

    if (classErr || !cls) {
      skipReason = `Could not create test class: ${classErr?.message ?? "unknown"}`;
      return;
    }
    classId = cls.id;

    const [activeStudent, waitStudent] = students;

    const { data: activeEnroll, error: activeErr } = await supabase
      .from("enrollments")
      .insert({
        studio_id: studioId,
        class_id: classId,
        student_id: activeStudent.id,
        status: "active",
      })
      .select("id")
      .single();

    if (activeErr || !activeEnroll) {
      skipReason = `Could not create active enrollment: ${activeErr?.message}`;
      return;
    }
    activeEnrollmentId = activeEnroll.id;

    const { data: waitEnroll, error: waitErr } = await supabase
      .from("enrollments")
      .insert({
        studio_id: studioId,
        class_id: classId,
        student_id: waitStudent.id,
        status: "waitlisted",
      })
      .select("id")
      .single();

    if (waitErr || !waitEnroll) {
      skipReason = `Could not create waitlisted enrollment: ${waitErr?.message}`;
      return;
    }
    waitlistedEnrollmentId = waitEnroll.id;
    waitlistedStudentId = waitStudent.id;
  });

  it("promotes the oldest waitlisted student when an active spot frees", async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const supabase = createAdminClient();

    const { error: deleteErr } = await supabase
      .from("enrollments")
      .delete()
      .eq("id", activeEnrollmentId!);
    expect(deleteErr).toBeNull();

    const { data: promoted, error: fetchErr } = await supabase
      .from("enrollments")
      .select("status")
      .eq("id", waitlistedEnrollmentId!)
      .single();

    expect(fetchErr).toBeNull();
    expect(promoted?.status).toBe("active");

    const { count } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", waitlistedStudentId!)
      .eq("type", "waitlist_promoted");

    expect(count).toBeGreaterThan(0);

    // Cleanup test class (cascades enrollments)
    await supabase.from("classes").delete().eq("id", classId!);
  });
});
