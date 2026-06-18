"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePlatformOperator } from "@/lib/platform/auth";
import { logPlatformAudit } from "@/lib/platform/audit";
import type { PlatformTask } from "@/lib/platform/types";

export type ActionResult = { ok: true; task?: PlatformTask } | { ok: false; error: string };

const CreateSchema = z.object({
  taskType: z.string().min(1),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  studioId: z.string().uuid().optional(),
  priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  dueAt: z.string().datetime().optional(),
});

export async function createTask(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = CreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("platform_tasks")
    .insert({
      task_type: parsed.data.taskType,
      title: parsed.data.title,
      description: parsed.data.description ?? null,
      studio_id: parsed.data.studioId ?? null,
      priority: parsed.data.priority,
      due_at: parsed.data.dueAt ?? null,
      created_by: auth.userId,
      assigned_to: auth.userId,
    })
    .select("id, task_type, title, description, studio_id, status, priority, due_at, assigned_to, metadata, created_at, completed_at")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create task" };

  await logPlatformAudit({
    operatorId: auth.userId,
    action: "task.create",
    targetType: "task",
    targetId: data.id,
    metadata: { taskType: parsed.data.taskType },
  });

  revalidatePath("/platform/tasks");
  revalidatePath("/platform");

  return {
    ok: true,
    task: {
      id: data.id,
      taskType: data.task_type,
      title: data.title,
      description: data.description,
      studioId: data.studio_id,
      studioName: null,
      status: data.status as PlatformTask["status"],
      priority: data.priority as PlatformTask["priority"],
      dueAt: data.due_at,
      assignedTo: data.assigned_to,
      metadata: (data.metadata as Record<string, unknown>) ?? {},
      createdAt: data.created_at,
      completedAt: data.completed_at,
    },
  };
}

const StatusSchema = z.object({
  taskId: z.string().uuid(),
  status: z.enum(["todo", "in_progress", "blocked", "done"]),
});

export async function updateTaskStatus(input: unknown): Promise<ActionResult> {
  const auth = await requirePlatformOperator();
  if (!auth.ok) return auth;

  const parsed = StatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const admin = createAdminClient();
  const updates: Record<string, unknown> = {
    status: parsed.data.status,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.status === "done") {
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await admin.from("platform_tasks").update(updates).eq("id", parsed.data.taskId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/platform/tasks");
  revalidatePath("/platform");
  return { ok: true };
}
