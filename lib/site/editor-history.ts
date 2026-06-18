// ============================================================================
//  lib/site/editor-history.ts — undo/redo stack for the page editor.
// ============================================================================

import { useCallback, useRef, useState } from "react";
import type { Block } from "./blocks";
import type { PageBackground } from "./background";

export type EditorSnapshot = {
  blocks: Block[];
  background: PageBackground;
};

const MAX_HISTORY = 50;

function cloneSnapshot(s: EditorSnapshot): EditorSnapshot {
  return {
    blocks: structuredClone(s.blocks),
    background: structuredClone(s.background),
  };
}

export function useEditorHistory(initial: EditorSnapshot) {
  const past = useRef<EditorSnapshot[]>([]);
  const future = useRef<EditorSnapshot[]>([]);
  const applying = useRef(false);

  const [snapshot, setSnapshot] = useState<EditorSnapshot>(() => cloneSnapshot(initial));
  const [historyMeta, setHistoryMeta] = useState({ canUndo: false, canRedo: false });

  const syncMeta = useCallback(() => {
    setHistoryMeta({
      canUndo: past.current.length > 0,
      canRedo: future.current.length > 0,
    });
  }, []);

  const pushPast = useCallback(
    (current: EditorSnapshot) => {
      past.current.push(cloneSnapshot(current));
      if (past.current.length > MAX_HISTORY) past.current.shift();
      future.current = [];
      syncMeta();
    },
    [syncMeta],
  );

  /** Save current state to the undo stack without changing anything (e.g. drag start). */
  const checkpoint = useCallback(() => {
    setSnapshot((current) => {
      pushPast(current);
      return current;
    });
  }, [pushPast]);

  /** Replace state; records the prior snapshot when record is true. */
  const apply = useCallback(
    (next: EditorSnapshot, record = true) => {
      setSnapshot((current) => {
        if (record && !applying.current) {
          pushPast(current);
        }
        return cloneSnapshot(next);
      });
    },
    [pushPast],
  );

  const replace = useCallback(
    (next: EditorSnapshot) => {
      applying.current = true;
      setSnapshot(cloneSnapshot(next));
      applying.current = false;
      syncMeta();
    },
    [syncMeta],
  );

  const undo = useCallback(() => {
    const prev = past.current.pop();
    if (!prev) return false;
    setSnapshot((current) => {
      future.current.push(cloneSnapshot(current));
      syncMeta();
      return prev;
    });
    return true;
  }, [syncMeta]);

  const redo = useCallback(() => {
    const next = future.current.pop();
    if (!next) return false;
    setSnapshot((current) => {
      past.current.push(cloneSnapshot(current));
      syncMeta();
      return next;
    });
    return true;
  }, [syncMeta]);

  const resetHistory = useCallback(
    (saved: EditorSnapshot) => {
      past.current = [];
      future.current = [];
      replace(saved);
    },
    [replace],
  );

  return {
    blocks: snapshot.blocks,
    background: snapshot.background,
    apply,
    replace,
    checkpoint,
    undo,
    redo,
    resetHistory,
    canUndo: historyMeta.canUndo,
    canRedo: historyMeta.canRedo,
  };
}
