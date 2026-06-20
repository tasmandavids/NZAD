"use client";

// ============================================================================
//  ScheduleBuilder — drag class blocks from the tray into a Day × Time grid.
//  Grid axes map directly to the DB: day_of_week (1=Mon…6=Sat) × start_time.
//
//  On drop, calls rescheduleClass() server action to persist the change.
//  Moving a card back to the tray calls rescheduleClass(id, null, null).
//
//  Library: @hello-pangea/dnd (already installed)
// ============================================================================

import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { useFormatTimeShort } from "@/lib/i18n/client";
import { useCallback, useState, useTransition } from "react";
import { rescheduleClass } from "@/app/portal/admin/classes/schedule-actions";
import { slotKey, SCHEDULE_DAYS, SCHEDULE_SLOTS, type ClassBlock } from "./types";

type Lists = Record<string, ClassBlock[]>;

// Build the initial lists from server-provided classes.
// Scheduled classes are placed in their day:time cell; the rest go to the tray.
function buildLists(classes: ClassBlock[]): Lists {
  const lists: Lists = { tray: [] };

  // Pre-populate all cells with empty arrays
  SCHEDULE_DAYS.forEach((d) =>
    SCHEDULE_SLOTS.forEach((s) => {
      lists[slotKey(String(d.dow), s.id)] = [];
    })
  );

  for (const cls of classes) {
    if (cls.dayOfWeek !== null && cls.startTime !== null) {
      const key = slotKey(String(cls.dayOfWeek), cls.startTime);
      if (lists[key] !== undefined) {
        lists[key].push(cls);
      } else {
        lists.tray.push(cls);
      }
    } else {
      lists.tray.push(cls);
    }
  }

  return lists;
}

function ClassCard({
  block,
  dragging,
  durationLabel,
}: {
  block: ClassBlock;
  dragging?: boolean;
  durationLabel?: string;
}) {
  return (
    <div
      className={`rounded-lg border bg-base px-3 py-2 transition-transform hover:-translate-y-0.5 ${
        dragging ? "border-[--brand] shadow-2xl" : "border-[--hair]"
      }`}
    >
      <div className="flex items-center gap-2">
        <span
          className="h-2.5 w-2.5 flex-none rounded-full"
          style={{ background: "var(--brand)" }}
        />
        <span className="text-sm font-semibold text-ink">{block.name}</span>
      </div>
      <p className="mt-0.5 pl-[18px] text-xs text-muted">
        {block.level}
        {durationLabel ? ` · ${durationLabel}` : ""}
      </p>
    </div>
  );
}

export function ScheduleBuilder({ classes }: { classes: ClassBlock[] }) {
  const t = useTranslations("admin.dashboard.schedule");
  const tShared = useTranslations("admin.shared");
  const tDays = useTranslations("common.days");
  const formatTime = useFormatTimeShort();
  const dayKey: Record<string, "mon" | "tue" | "wed" | "thu" | "fri" | "sat"> = {
    Mon: "mon", Tue: "tue", Wed: "wed", Thu: "thu", Fri: "fri", Sat: "sat",
  };
  const [lists, setLists] = useState<Lists>(() => buildLists(classes));
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Parse a droppableId back to {dayOfWeek, startTime} or null if tray
  function parseDropId(id: string): { dayOfWeek: number; startTime: string } | null {
    if (id === "tray") return null;
    const sepIdx = id.indexOf(":");
    const dow = id.slice(0, sepIdx);
    const time = id.slice(sepIdx + 1);
    return { dayOfWeek: Number(dow), startTime: time };
  }

  const onDragEnd = useCallback(
    ({ source, destination }: DropResult) => {
      if (!destination) return;
      if (
        source.droppableId === destination.droppableId &&
        source.index === destination.index
      )
        return;

      let movedBlock!: ClassBlock;

      setLists((prev) => {
        const next: Lists = { ...prev };
        const src = Array.from(next[source.droppableId]);
        const [moved] = src.splice(source.index, 1);
        movedBlock = moved;
        const dst =
          source.droppableId === destination.droppableId
            ? src
            : Array.from(next[destination.droppableId]);
        dst.splice(destination.index, 0, moved);

        // A board cell holds one class — send any displaced card back to tray
        if (destination.droppableId !== "tray" && dst.length > 1) {
          const tray =
            source.droppableId === "tray"
              ? src
              : Array.from(next.tray);
          const displaced = dst.find((c) => c.id !== moved.id)!;
          dst.splice(dst.indexOf(displaced), 1);
          tray.push(displaced);
          next.tray = tray;
        }

        next[source.droppableId] = src;
        next[destination.droppableId] = dst;
        return next;
      });

      // Persist to DB
      const target = parseDropId(destination.droppableId);
      startTransition(async () => {
        const result = await rescheduleClass(
          movedBlock.id,
          target?.dayOfWeek ?? null,
          target?.startTime ?? null,
        );
        if (!result.ok) {
          setErrorMsg(result.error);
        } else {
          setErrorMsg(null);
        }
      });
    },
    []
  );

  const placed = Object.entries(lists)
    .filter(([k]) => k !== "tray")
    .reduce((n, [, v]) => n + v.length, 0);

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <motion.section
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-[--hair] bg-surface p-6"
      >
        <header className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-ink">{t("title")}</h2>
            <p className="text-sm text-muted">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-3">
            {isPending && (
              <span className="text-xs text-muted animate-pulse">{tShared("saving")}</span>
            )}
            {errorMsg && (
              <span className="text-xs text-red-500">{errorMsg}</span>
            )}
            <span className="text-xs text-muted">
              {tShared("placedCount", { placed, unscheduled: lists.tray.length })}
            </span>
          </div>
        </header>

        {/* TRAY ------------------------------------------------------------ */}
        <Droppable droppableId="tray" direction="horizontal">
          {(provided, snapshot) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
              className="mb-6 flex min-h-[64px] flex-wrap gap-2 rounded-xl border border-dashed p-3 transition-colors"
              style={{
                borderColor: snapshot.isDraggingOver
                  ? "var(--brand)"
                  : "var(--hair)",
              }}
            >
              {lists.tray.map((block, i) => (
                <Draggable key={block.id} draggableId={block.id} index={i}>
                  {(p, snap) => (
                    <div
                      ref={p.innerRef}
                      {...p.draggableProps}
                      {...p.dragHandleProps}
                    >
                      <ClassCard
                        block={block}
                        dragging={snap.isDragging}
                        durationLabel={
                          block.durationMin
                            ? t("durationMin", { minutes: block.durationMin })
                            : undefined
                        }
                      />
                    </div>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
              {lists.tray.length === 0 && (
                <span className="self-center text-xs text-muted">
                  {t("allScheduled")}
                </span>
              )}
            </div>
          )}
        </Droppable>

        {/* BOARD: days (rows) × time slots (columns) ----------------------- */}
        <div
          className="grid gap-1.5"
          style={{
            gridTemplateColumns: `72px repeat(${SCHEDULE_SLOTS.length}, minmax(0,1fr))`,
          }}
        >
          {/* Header row */}
          <div />
          {SCHEDULE_SLOTS.map((s) => (
            <div
              key={s.id}
              className="pb-1 text-center text-xs font-semibold uppercase tracking-wider text-muted"
            >
              {formatTime(s.id)}
            </div>
          ))}

          {/* Day rows */}
          {SCHEDULE_DAYS.map((day) => (
            <div key={day.dow} className="contents">
              <div className="flex items-center text-sm font-semibold text-ink">
                {tDays(dayKey[day.label])}
              </div>
              {SCHEDULE_SLOTS.map((s) => {
                const id = slotKey(String(day.dow), s.id);
                return (
                  <Droppable key={id} droppableId={id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="min-h-[68px] rounded-lg p-1.5 transition-colors"
                        style={{
                          background: snapshot.isDraggingOver
                            ? "color-mix(in srgb, var(--brand) 16%, var(--surface))"
                            : "color-mix(in srgb, var(--text) 3%, var(--surface))",
                          boxShadow: "inset 0 0 0 1px var(--hair)",
                        }}
                      >
                        {lists[id].map((block, i) => (
                          <Draggable
                            key={block.id}
                            draggableId={block.id}
                            index={i}
                          >
                            {(p, snap) => (
                              <div
                                ref={p.innerRef}
                                {...p.draggableProps}
                                {...p.dragHandleProps}
                              >
                                <ClassCard
                                  block={block}
                                  dragging={snap.isDragging}
                                  durationLabel={
                                    block.durationMin
                                      ? t("durationMin", { minutes: block.durationMin })
                                      : undefined
                                  }
                                />
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          ))}
        </div>
      </motion.section>
    </DragDropContext>
  );
}
