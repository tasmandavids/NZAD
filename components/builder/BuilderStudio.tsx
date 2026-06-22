// ============================================================================
//  components/builder/BuilderStudio.tsx — the assembled editor shell.
//  Loads the document into the store, renders the chrome + canvas, and wires
//  keyboard shortcuts and debounced autosave.
// ============================================================================

"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useBuilder } from "@/lib/builder/store";
import type { BuilderDocument } from "@/lib/builder/schema";
import { Topbar } from "./Topbar";
import { LeftPanel } from "./LeftPanel";
import { CanvasViewport } from "./CanvasViewport";
import { Inspector } from "./Inspector";

export function BuilderStudio({
  initialDocument,
  save,
  backHref,
}: {
  initialDocument: BuilderDocument;
  save: (doc: BuilderDocument) => Promise<{ ok: boolean; error?: string }>;
  backHref?: string;
}) {
  const router = useRouter();
  const loadDocument = useBuilder((s) => s.loadDocument);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const savedRef = useRef(false);

  // Load once.
  useEffect(() => {
    loadDocument(initialDocument);
    savedRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doSave = async () => {
    const { doc } = useBuilder.getState();
    setSaving(true);
    setError(null);
    try {
      const res = await save(doc);
      if (res.ok) useBuilder.getState().markSaved();
      else setError(res.error ?? "Save failed");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  // Debounced autosave whenever the doc becomes dirty.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    const unsub = useBuilder.subscribe((s) => {
      if (!s.dirty || !savedRef.current) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => { void doSave(); }, 1500);
    });
    return () => { if (timer) clearTimeout(timer); unsub(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts (suppressed while inline-editing text).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useBuilder.getState();
      if (s.editingId) return;
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? s.redo() : s.undo();
      } else if (meta && e.key.toLowerCase() === "d") {
        e.preventDefault();
        if (s.selection[0]) s.duplicateNode(s.selection[0]);
      } else if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void doSave();
      } else if ((e.key === "Delete" || e.key === "Backspace") && s.selection.length) {
        e.preventDefault();
        s.deleteNodes(s.selection);
      } else if (e.key === "Escape") {
        s.select(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-100">
      <Topbar saving={saving} onSave={doSave} onExit={backHref ? () => router.push(backHref) : undefined} />
      {error && <div className="bg-red-600 px-3 py-1 text-center text-xs text-white">{error}</div>}
      <div className="flex min-h-0 flex-1">
        <LeftPanel />
        <CanvasViewport />
        <Inspector />
      </div>
    </div>
  );
}
