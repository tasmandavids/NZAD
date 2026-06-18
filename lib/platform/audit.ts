"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function logPlatformAudit(input: {
  operatorId: string;
  action: string;
  targetType?: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}) {
  const admin = createAdminClient();
  await admin.from("platform_audit_log").insert({
    operator_id: input.operatorId,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  });
}
