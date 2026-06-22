// ============================================================================
//  components/builder/LeftPanel.tsx — Insert palette + Layers tree.
// ============================================================================

"use client";

import { useState } from "react";
import { useBuilder } from "@/lib/builder/store";
import { COMPONENT_GROUPS, COMPONENT_LIBRARY } from "@/lib/builder/defaults";
import type { BuilderNode, NodeId } from "@/lib/builder/schema";

export function LeftPanel() {
  const [tab, setTab] = useState<"insert" | "layers">("insert");
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-black/10 bg-white">
      <div className="flex border-b border-black/10 text-xs font-medium">
        {(["insert", "layers"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 capitalize ${tab === t ? "border-b-2 border-violet-600 text-violet-700" : "text-neutral-500"}`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2">{tab === "insert" ? <InsertPalette /> : <LayersTree />}</div>
    </aside>
  );
}

function InsertPalette() {
  const insert = useBuilder((s) => s.insertComponent);
  const selection = useBuilder((s) => s.selection);
  const nodes = useBuilder((s) => s.doc.nodes);

  // Insert into the selected frame (or the selected node's parent), else root.
  const targetParent = (): NodeId | undefined => {
    const sel = selection[0];
    if (!sel) return undefined;
    const node = nodes[sel];
    if (node?.type === "frame") return sel;
    return node?.parent ?? undefined;
  };

  return (
    <div className="space-y-3">
      {COMPONENT_GROUPS.map((group) => (
        <div key={group}>
          <div className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">{group}</div>
          <div className="grid grid-cols-2 gap-1.5">
            {COMPONENT_LIBRARY.filter((c) => c.group === group).map((c) => (
              <button
                key={c.key}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/x-builder-component", c.key);
                  e.dataTransfer.effectAllowed = "copy";
                }}
                onClick={() => insert(c.key, targetParent())}
                className="flex flex-col items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2.5 text-[11px] text-neutral-600 hover:border-violet-300 hover:bg-violet-50"
                title={`Add ${c.label}`}
              >
                <span className="text-base leading-none">{c.icon}</span>
                {c.label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LayersTree() {
  const rootId = useBuilder((s) => s.doc.rootId);
  return (
    <div className="space-y-0.5 text-xs">
      <LayerRow id={rootId} depth={0} />
    </div>
  );
}

function LayerRow({ id, depth }: { id: NodeId; depth: number }) {
  const node = useBuilder((s) => s.doc.nodes[id]) as BuilderNode | undefined;
  const selected = useBuilder((s) => s.selection.includes(id));
  const [open, setOpen] = useState(true);
  if (!node) return null;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        onClick={(e) => { e.stopPropagation(); useBuilder.getState().select(id, e.shiftKey); }}
        onMouseEnter={() => useBuilder.getState().setHover(id)}
        onMouseLeave={() => useBuilder.getState().setHover(null)}
        className={`group flex items-center gap-1 rounded px-1 py-1 ${selected ? "bg-violet-100 text-violet-800" : "hover:bg-neutral-100 text-neutral-700"}`}
        style={{ paddingLeft: 4 + depth * 12 }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }} className="w-3 text-neutral-400">
            {open ? "▾" : "▸"}
          </button>
        ) : (
          <span className="w-3" />
        )}
        <span className="truncate flex-1">{node.name}</span>
        <button
          onClick={(e) => { e.stopPropagation(); useBuilder.getState().toggleHidden(id); }}
          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700"
          title={node.hidden ? "Show" : "Hide"}
        >
          {node.hidden ? "⊘" : "👁"}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); useBuilder.getState().toggleLock(id); }}
          className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700"
          title={node.locked ? "Unlock" : "Lock"}
        >
          {node.locked ? "🔒" : "🔓"}
        </button>
      </div>
      {open && node.children.map((cid) => <LayerRow key={cid} id={cid} depth={depth + 1} />)}
    </div>
  );
}
