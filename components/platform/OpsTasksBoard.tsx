"use client";

import { useState, useTransition } from "react";
import type { PlatformTask } from "@/lib/platform/types";
import { PLATFORM_TASK_TYPES } from "@/lib/platform/types";
import { createTask, updateTaskStatus } from "@/app/platform/tasks/actions";

const COLUMNS = [
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "blocked", label: "Blocked" },
  { id: "done", label: "Done" },
] as const;

export function OpsTasksBoard({
  tasks: initialTasks,
  studios,
}: {
  tasks: PlatformTask[];
  studios: { id: string; name: string }[];
}) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [taskType, setTaskType] = useState<string>(PLATFORM_TASK_TYPES[0].key);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studioId, setStudioId] = useState("");
  const [priority, setPriority] = useState<PlatformTask["priority"]>("normal");
  const [pending, startTransition] = useTransition();

  function moveTask(id: string, status: PlatformTask["status"]) {
    startTransition(async () => {
      const res = await updateTaskStatus({ taskId: id, status });
      if (res.ok) {
        setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, status } : t)));
      }
    });
  }

  function addTask() {
    if (!title.trim()) return;
    startTransition(async () => {
      const res = await createTask({
        taskType,
        title: title.trim(),
        description: description.trim() || undefined,
        studioId: studioId || undefined,
        priority,
      });
      if (res.ok && res.task) {
        setTasks((prev) => [res.task!, ...prev]);
        setShowForm(false);
        setTitle("");
        setDescription("");
        setStudioId("");
      }
    });
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink">Ops tasks</h1>
          <p className="text-sm text-muted">
            Backend work queue — onboarding reviews, billing, domains, rollouts, and more.
          </p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-full bg-brand px-5 py-2 text-xs font-bold uppercase text-white"
        >
          {showForm ? "Cancel" : "New task"}
        </button>
      </header>

      {showForm && (
        <div className="rounded-2xl border border-[--hair] bg-surface p-5 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-widest text-muted">Type</span>
              <select
                value={taskType}
                onChange={(e) => setTaskType(e.target.value)}
                className="mt-1 w-full rounded-xl border border-[--hair] bg-base px-3 py-2"
              >
                {PLATFORM_TASK_TYPES.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm">
              <span className="text-xs uppercase tracking-widest text-muted">Priority</span>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as PlatformTask["priority"])}
                className="mt-1 w-full rounded-xl border border-[--hair] bg-base px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="normal">Normal</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-widest text-muted">Title</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[--hair] bg-base px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="text-xs uppercase tracking-widest text-muted">Studio (optional)</span>
            <select
              value={studioId}
              onChange={(e) => setStudioId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-[--hair] bg-base px-3 py-2"
            >
              <option value="">Platform-wide</option>
              {studios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Details, links, context…"
            className="w-full rounded-xl border border-[--hair] bg-base px-3 py-2 text-sm"
          />
          <button
            onClick={addTask}
            disabled={pending}
            className="rounded-full border border-[--hair] px-4 py-1.5 text-xs font-bold uppercase"
          >
            Create task
          </button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-4">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.id);
          return (
            <div key={col.id} className="rounded-2xl border border-[--hair] bg-surface/50 p-3">
              <h2 className="mb-3 text-xs font-bold uppercase tracking-widest text-muted">
                {col.label} ({colTasks.length})
              </h2>
              <ul className="space-y-2">
                {colTasks.map((t) => (
                  <li key={t.id} className="rounded-xl border border-[--hair] bg-base p-3 text-sm">
                    <p className="font-semibold text-ink">{t.title}</p>
                    <p className="text-[0.65rem] uppercase text-muted">{t.taskType.replace(/_/g, " ")}</p>
                    {t.studioName && (
                      <p className="mt-1 text-xs text-muted">{t.studioName}</p>
                    )}
                    <select
                      value={t.status}
                      onChange={(e) => moveTask(t.id, e.target.value as PlatformTask["status"])}
                      disabled={pending}
                      className="mt-2 w-full rounded-lg border border-[--hair] bg-surface px-2 py-1 text-[0.65rem]"
                    >
                      {COLUMNS.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
