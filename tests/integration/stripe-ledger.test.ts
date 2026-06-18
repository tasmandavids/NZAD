import { describe, it, expect, beforeAll } from "vitest";
import { createAdminClient } from "@/lib/supabase/admin";
import { integrationEnabled, integrationSkipReason } from "./helpers/env";
import { missingTables, migrationsHint } from "./helpers/schema";

const run = integrationEnabled();

describe.skipIf(!run)("stripe webhook idempotency ledger (0020)", () => {
  let skipReason = integrationSkipReason();
  const eventId = `evt_integration_${Date.now()}`;

  beforeAll(async () => {
    if (!run) return;

    const supabase = createAdminClient();
    const missing = await missingTables(supabase);
    if (missing.includes("stripe_events")) {
      skipReason = migrationsHint(["stripe_events"]);
    }
  });

  it("rejects duplicate event.id with unique violation (23505)", async () => {
    if (skipReason) {
      console.warn(`SKIP: ${skipReason}`);
      return;
    }

    const supabase = createAdminClient();

    const { error: firstErr } = await supabase
      .from("stripe_events")
      .insert({ id: eventId, type: "payment_intent.succeeded" });
    expect(firstErr).toBeNull();

    const { error: dupErr } = await supabase
      .from("stripe_events")
      .insert({ id: eventId, type: "payment_intent.succeeded" });

    expect(dupErr?.code).toBe("23505");

    await supabase.from("stripe_events").delete().eq("id", eventId);
  });
});
