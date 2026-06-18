"use client";

// ============================================================================
//  PageEditor — visual block editor for a single website page.
//  Left: page settings, block list (drag to reorder), add-block menu, and the
//  inspector for the selected block. Right: live preview (BlockRenderer).
// ============================================================================

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DragDropContext,
  Droppable,
  Draggable,
  type DropResult,
} from "@hello-pangea/dnd";
import {
  APPEARANCE_DEFAULTS,
  APPEARANCE_FIELDS,
  BLOCK_LIBRARY,
  BLOCK_MAP,
  cloneBlock,
  makeBlock,
  type Block,
  type BlockItem,
  type BlockType,
  type FieldDef,
  type PropValue,
} from "@/lib/site/blocks";
import { BlockRenderer } from "@/components/site/BlockRenderer";
import ImageInput from "@/components/admin/site/ImageInput";
import { savePageBlocks, updatePageMeta, publishPage } from "@/app/portal/admin/site/actions";

type EditablePage = {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  isHome: boolean;
  showInNav: boolean;
  navLabel: string;
  navOrder: number;
  seoTitle: string;
  seoDescription: string;
  blocks: Block[];
};

// Seed appearance props on blocks loaded from the DB that predate the feature,
// so the inspector selects render the correct (original) default option.
function seedAppearance(blocks: Block[]): Block[] {
  return blocks.map((b) => {
    if (!BLOCK_MAP[b.type]?.appearance) return b;
    const def = APPEARANCE_DEFAULTS[b.type] ?? { _bg: "base", _spacing: "normal" };
    const props = { ...b.props };
    if (props._bg === undefined) props._bg = def._bg;
    if (props._spacing === undefined) props._spacing = def._spacing;
    return { ...b, props };
  });
}

export default function PageEditor({ page }: { page: EditablePage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [blocks, setBlocks] = useState<Block[]>(() => seedAppearance(page.blocks));
  const [selectedId, setSelectedId] = useState<string | null>(page.blocks[0]?.id ?? null);
  const [showAdd, setShowAdd] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [status, setStatus] = useState<"draft" | "published">(page.status);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Page meta (settings drawer).
  const [meta, setMeta] = useState({
    title: page.title,
    slug: page.slug,
    navLabel: page.navLabel,
    showInNav: page.showInNav,
    navOrder: page.navOrder,
    seoTitle: page.seoTitle,
    seoDescription: page.seoDescription,
  });

  const selected = useMemo(() => blocks.find((b) => b.id === selectedId) ?? null, [blocks, selectedId]);

  const touch = () => setDirty(true);

  // Warn before leaving (tab close / reload / external nav) with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Guard in-app navigation (router pushes don't fire beforeunload).
  const confirmLeave = (e: React.MouseEvent) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave this page?")) {
      e.preventDefault();
    }
  };

  // ── Block operations ─────────────────────────────────────────────────────
  const addBlock = (type: BlockType) => {
    const b = makeBlock(type);
    setBlocks((prev) => [...prev, b]);
    setSelectedId(b.id);
    setShowAdd(false);
    touch();
  };

  const deleteBlock = (id: string) => {
    setBlocks((prev) => prev.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
    touch();
  };

  const duplicateBlock = (id: string) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return prev;
      const copy = cloneBlock(prev[idx]);
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      setSelectedId(copy.id);
      return next;
    });
    touch();
  };

  const moveBlock = (id: string, dir: -1 | 1) => {
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      const j = idx + dir;
      if (idx === -1 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[j]] = [next[j], next[idx]];
      return next;
    });
    touch();
  };

  const onDragEnd = ({ source, destination }: DropResult) => {
    if (!destination || destination.index === source.index) return;
    setBlocks((prev) => {
      const next = [...prev];
      const [moved] = next.splice(source.index, 1);
      next.splice(destination.index, 0, moved);
      return next;
    });
    touch();
  };

  const setProp = (key: string, value: PropValue) => {
    if (!selected) return;
    setBlocks((prev) =>
      prev.map((b) => (b.id === selected.id ? { ...b, props: { ...b.props, [key]: value } } : b)),
    );
    touch();
  };

  const getList = (key: string): BlockItem[] => {
    const v = selected?.props[key];
    return Array.isArray(v) ? v : [];
  };

  const updateItem = (key: string, index: number, itemKey: string, value: string) => {
    const next = getList(key).map((it, i) => (i === index ? { ...it, [itemKey]: value } : it));
    setProp(key, next);
  };

  const addItem = (key: string, def: BlockItem) => setProp(key, [...getList(key), { ...def }]);

  const removeItem = (key: string, index: number) =>
    setProp(key, getList(key).filter((_, i) => i !== index));

  const moveItem = (key: string, index: number, dir: -1 | 1) => {
    const arr = [...getList(key)];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setProp(key, arr);
  };

  // ── Persistence ──────────────────────────────────────────────────────────
  const save = () =>
    startTransition(async () => {
      setMsg(null);
      const metaRes = await updatePageMeta({ pageId: page.id, ...meta });
      if (!metaRes.ok) {
        setMsg(metaRes.error);
        return;
      }
      const res = await savePageBlocks(page.id, blocks);
      if (!res.ok) {
        setMsg(res.error);
        return;
      }
      setDirty(false);
      setMsg("Saved");
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });

  const saveAndPublish = () =>
    startTransition(async () => {
      setMsg(null);
      const metaRes = await updatePageMeta({ pageId: page.id, ...meta });
      if (!metaRes.ok) return setMsg(metaRes.error);
      const blkRes = await savePageBlocks(page.id, blocks);
      if (!blkRes.ok) return setMsg(blkRes.error);
      const pubRes = await publishPage(page.id);
      if (!pubRes.ok) return setMsg(pubRes.error);
      setStatus("published");
      setDirty(false);
      setMsg("Published");
      router.refresh();
      setTimeout(() => setMsg(null), 2000);
    });

  const publicHref = page.isHome ? "/" : `/${meta.slug}`;

  return (
    <div className="flex h-[100dvh] flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between gap-3 border-b border-[--hair] bg-surface px-5 py-3">
        <div className="flex items-center gap-3">
          <Link href="/portal/admin/site" onClick={confirmLeave} className="text-sm text-muted hover:text-ink">
            ← Pages
          </Link>
          <span className="font-semibold text-ink">{meta.title || "Untitled"}</span>
          <span
            className="rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wider"
            style={{
              background: status === "published" ? "rgba(34,197,94,.15)" : "var(--hair)",
              color: status === "published" ? "#22c55e" : "var(--muted)",
            }}
          >
            {status}
          </span>
          {dirty && <span className="text-xs text-amber-500">Unsaved changes</span>}
        </div>
        <div className="flex items-center gap-2">
          {msg && (
            <span className="text-xs" style={{ color: msg === "Saved" || msg === "Published" ? "var(--brand-hot)" : "#ef4444" }}>
              {msg}
            </span>
          )}
          <button
            onClick={() => setShowSettings((v) => !v)}
            className="rounded-full border border-[--hair] px-4 py-1.5 text-sm text-ink transition hover:bg-base"
          >
            Settings
          </button>
          <Link
            href={publicHref}
            target="_blank"
            className="rounded-full border border-[--hair] px-4 py-1.5 text-sm text-ink transition hover:bg-base"
          >
            View
          </Link>
          <button
            onClick={save}
            disabled={pending}
            className="rounded-full border border-[--hair] px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-base disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button
            onClick={saveAndPublish}
            disabled={pending}
            className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Left rail: blocks + inspector */}
        <aside className="flex w-[360px] shrink-0 flex-col overflow-y-auto border-r border-[--hair] bg-base">
          {showSettings ? (
            <PageSettings meta={meta} isHome={page.isHome} onChange={(m) => { setMeta(m); touch(); }} />
          ) : (
            <>
              {/* Block list */}
              <div className="border-b border-[--hair] p-4">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Blocks</h2>
                  <button
                    onClick={() => setShowAdd((v) => !v)}
                    className="rounded-full bg-brand px-3 py-1 text-xs font-semibold text-white"
                  >
                    {showAdd ? "Close" : "+ Add"}
                  </button>
                </div>

                {showAdd && (
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {BLOCK_LIBRARY.map((def) => (
                      <button
                        key={def.type}
                        onClick={() => addBlock(def.type)}
                        title={def.description}
                        className="rounded-lg border border-[--hair] bg-surface px-2 py-2 text-left text-xs text-ink transition hover:border-brand"
                      >
                        {def.label}
                      </button>
                    ))}
                  </div>
                )}

                {blocks.length === 0 ? (
                  <p className="py-6 text-center text-xs text-muted">No blocks yet — add one above.</p>
                ) : (
                  <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="blocks">
                      {(provided) => (
                        <ul ref={provided.innerRef} {...provided.droppableProps} className="space-y-1.5">
                          {blocks.map((b, i) => (
                            <Draggable key={b.id} draggableId={b.id} index={i}>
                              {(p) => (
                                <li
                                  ref={p.innerRef}
                                  {...p.draggableProps}
                                  className={`flex items-center justify-between rounded-lg border px-3 py-2 text-sm ${
                                    selectedId === b.id
                                      ? "border-brand bg-surface"
                                      : "border-[--hair] bg-surface"
                                  }`}
                                >
                                  <button
                                    className="flex flex-1 items-center gap-2 text-left text-ink"
                                    onClick={() => setSelectedId(b.id)}
                                  >
                                    <span {...p.dragHandleProps} className="cursor-grab text-muted">⠿</span>
                                    {BLOCK_MAP[b.type].label}
                                  </button>
                                  <span className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => moveBlock(b.id, -1)}
                                      disabled={i === 0}
                                      title="Move up"
                                      className="px-1 text-xs text-muted transition hover:text-ink disabled:opacity-30"
                                    >
                                      ↑
                                    </button>
                                    <button
                                      onClick={() => moveBlock(b.id, 1)}
                                      disabled={i === blocks.length - 1}
                                      title="Move down"
                                      className="px-1 text-xs text-muted transition hover:text-ink disabled:opacity-30"
                                    >
                                      ↓
                                    </button>
                                    <button
                                      onClick={() => duplicateBlock(b.id)}
                                      title="Duplicate"
                                      className="px-1 text-xs text-muted transition hover:text-ink"
                                    >
                                      ⧉
                                    </button>
                                    <button
                                      onClick={() => deleteBlock(b.id)}
                                      title="Delete"
                                      className="px-1 text-xs text-red-500 hover:underline"
                                    >
                                      ✕
                                    </button>
                                  </span>
                                </li>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </ul>
                      )}
                    </Droppable>
                  </DragDropContext>
                )}
              </div>

              {/* Inspector */}
              <div className="flex-1 p-4">
                {selected ? (
                  <Inspector
                    key={selected.id}
                    block={selected}
                    fields={BLOCK_MAP[selected.type].fields}
                    onSet={setProp}
                    list={{ get: getList, update: updateItem, add: addItem, remove: removeItem, move: moveItem }}
                  />
                ) : (
                  <p className="text-center text-xs text-muted">Select a block to edit it.</p>
                )}
              </div>
            </>
          )}
        </aside>

        {/* Live preview */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-base">
          <div className="pointer-events-none">
            <BlockRenderer blocks={blocks} context={PREVIEW_CONTEXT} />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Inspector (auto-generated fields) ────────────────────────────────────────

type ListOps = {
  get: (key: string) => BlockItem[];
  update: (key: string, index: number, itemKey: string, value: string) => void;
  add: (key: string, def: BlockItem) => void;
  remove: (key: string, index: number) => void;
  move: (key: string, index: number, dir: -1 | 1) => void;
};

function Inspector({
  block,
  fields,
  onSet,
  list,
}: {
  block: Block;
  fields: FieldDef[];
  onSet: (key: string, value: PropValue) => void;
  list: ListOps;
}) {
  const showAppearance = BLOCK_MAP[block.type].appearance;
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
        {BLOCK_MAP[block.type].label} settings
      </h3>
      {fields.map((f) =>
        f.type === "list" ? (
          <ListField key={f.key} field={f} list={list} />
        ) : (
          <ScalarField key={f.key} field={f} value={block.props[f.key]} onSet={onSet} />
        ),
      )}
      {showAppearance && (
        <>
          <hr className="border-[--hair]" />
          <h4 className="text-xs font-semibold uppercase tracking-widest text-muted">Appearance</h4>
          {APPEARANCE_FIELDS.map((f) => (
            <ScalarField key={f.key} field={f} value={block.props[f.key]} onSet={onSet} />
          ))}
        </>
      )}
    </div>
  );
}

function ScalarField({
  field,
  value,
  onSet,
}: {
  field: FieldDef;
  value: PropValue | undefined;
  onSet: (key: string, value: PropValue) => void;
}) {
  const str = typeof value === "string" ? value : value == null ? "" : String(value);
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{field.label}</span>
      {field.type === "image" ? (
        <ImageInput value={str} onChange={(url) => onSet(field.key, url)} />
      ) : field.type === "select" ? (
        <select
          value={str}
          onChange={(e) => onSet(field.key, e.target.value)}
          className="field-premium"
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      ) : field.type === "textarea" && field.toolbar ? (
        <RichTextArea
          value={str}
          placeholder={field.placeholder}
          onChange={(v) => onSet(field.key, v)}
        />
      ) : field.type === "textarea" ? (
        <textarea
          value={str}
          rows={4}
          placeholder={field.placeholder}
          onChange={(e) => onSet(field.key, e.target.value)}
          className="field-premium"
        />
      ) : field.type === "boolean" ? (
        <input
          type="checkbox"
          checked={value === true}
          onChange={(e) => onSet(field.key, e.target.checked)}
          className="h-4 w-4 accent-[--brand]"
        />
      ) : field.type === "number" ? (
        <input
          type="number"
          value={str}
          onChange={(e) => onSet(field.key, e.target.value === "" ? 0 : Number(e.target.value))}
          className="field-premium"
        />
      ) : (
        <input
          type="text"
          value={str}
          placeholder={field.placeholder}
          onChange={(e) => onSet(field.key, e.target.value)}
          className="field-premium"
        />
      )}
      {field.help && <span className="mt-1 block text-xs text-muted">{field.help}</span>}
    </label>
  );
}

// ─── RichTextArea (markdown-lite textarea with a formatting toolbar) ──────────
//  Inserts the same markdown-lite syntax BlockRenderer understands, so
//  non-technical clients don't have to learn it by hand. Selection-aware:
//  wraps/links the highlighted text, or inserts a sensible placeholder.

function RichTextArea({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  // After a controlled re-render we restore the caret/selection here.
  const pendingSel = useRef<[number, number] | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (pendingSel.current && el) {
      const [s, e] = pendingSel.current;
      el.focus();
      el.setSelectionRange(s, e);
      pendingSel.current = null;
    }
  });

  const apply = (next: string, selStart: number, selEnd: number) => {
    pendingSel.current = [selStart, selEnd];
    onChange(next);
  };

  // Wrap the current selection (or a placeholder) in a token like **…**.
  const wrap = (token: string, fallback: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + token + sel + token + value.slice(e);
    apply(next, s + token.length, s + token.length + sel.length);
  };

  // Insert a [text](url) link, leaving the caret over the url for editing.
  const insertLink = () => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const text = value.slice(s, e) || "link text";
    const url = "https://";
    const inserted = `[${text}](${url})`;
    const next = value.slice(0, s) + inserted + value.slice(e);
    const urlStart = s + 1 + text.length + 2; // past "[text]("
    apply(next, urlStart, urlStart + url.length);
  };

  // Prefix every line touched by the selection with a list marker.
  const prefixLines = (kind: "bullet" | "number") => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const lineStart = value.lastIndexOf("\n", s - 1) + 1;
    const after = value.indexOf("\n", e);
    const lineEnd = after === -1 ? value.length : after;
    const lines = value.slice(lineStart, lineEnd).split("\n");
    const transformed = lines
      .map((ln, i) => (kind === "bullet" ? `- ${ln}` : `${i + 1}. ${ln}`))
      .join("\n");
    const next = value.slice(0, lineStart) + transformed + value.slice(lineEnd);
    apply(next, lineStart, lineStart + transformed.length);
  };

  const btn =
    "rounded-md border border-[--hair] bg-surface px-2 py-1 text-xs font-medium text-ink transition hover:border-brand hover:text-brand";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => wrap("**", "bold text")} title="Bold" className={`${btn} font-bold`}>
          B
        </button>
        <button type="button" onClick={insertLink} title="Insert link" className={btn}>
          🔗 Link
        </button>
        <button type="button" onClick={() => prefixLines("bullet")} title="Bullet list" className={btn}>
          • List
        </button>
        <button type="button" onClick={() => prefixLines("number")} title="Numbered list" className={btn}>
          1. List
        </button>
      </div>
      <textarea
        ref={ref}
        value={value}
        rows={6}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="field-premium font-mono text-xs leading-relaxed"
      />
    </div>
  );
}

function ListField({ field, list }: { field: FieldDef; list: ListOps }) {
  const items = list.get(field.key);
  const itemFields = field.itemFields ?? [];
  return (
    <div className="space-y-2">
      <span className="block text-sm font-medium text-ink">{field.label}</span>
      {items.map((item, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-[--hair] bg-base p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Item {i + 1}</span>
            <span className="flex items-center gap-1">
              <button onClick={() => list.move(field.key, i, -1)} className="px-1 text-xs text-muted hover:text-ink">↑</button>
              <button onClick={() => list.move(field.key, i, 1)} className="px-1 text-xs text-muted hover:text-ink">↓</button>
              <button onClick={() => list.remove(field.key, i)} className="px-1 text-xs text-red-500">✕</button>
            </span>
          </div>
          {itemFields.map((itf) => (
            <label key={itf.key} className="block text-xs">
              <span className="mb-0.5 block text-muted">{itf.label}</span>
              {itf.type === "image" ? (
                <ImageInput
                  value={item[itf.key] ?? ""}
                  onChange={(url) => list.update(field.key, i, itf.key, url)}
                />
              ) : itf.type === "textarea" ? (
                <textarea
                  rows={2}
                  value={item[itf.key] ?? ""}
                  onChange={(e) => list.update(field.key, i, itf.key, e.target.value)}
                  className="field-premium"
                />
              ) : (
                <input
                  type="text"
                  value={item[itf.key] ?? ""}
                  onChange={(e) => list.update(field.key, i, itf.key, e.target.value)}
                  className="field-premium"
                />
              )}
            </label>
          ))}
        </div>
      ))}
      <button
        onClick={() => list.add(field.key, field.itemDefault ?? {})}
        className="w-full rounded-lg border border-dashed border-[--hair] py-2 text-xs text-muted transition hover:border-brand hover:text-ink"
      >
        + Add item
      </button>
    </div>
  );
}

// ─── Page settings drawer ─────────────────────────────────────────────────────

type Meta = {
  title: string;
  slug: string;
  navLabel: string;
  showInNav: boolean;
  navOrder: number;
  seoTitle: string;
  seoDescription: string;
};

function PageSettings({
  meta,
  isHome,
  onChange,
}: {
  meta: Meta;
  isHome: boolean;
  onChange: (m: Meta) => void;
}) {
  const set = <K extends keyof Meta>(key: K, value: Meta[K]) => onChange({ ...meta, [key]: value });
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Page settings</h2>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Title</span>
        <input value={meta.title} onChange={(e) => set("title", e.target.value)} className="field-premium" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">URL slug</span>
        <input
          value={isHome ? "home" : meta.slug}
          disabled={isHome}
          onChange={(e) => set("slug", e.target.value)}
          className="field-premium disabled:opacity-60"
        />
        <span className="mt-1 block text-xs text-muted">
          {isHome ? "The homepage always lives at /." : `Public URL: /${meta.slug}`}
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={meta.showInNav}
          onChange={(e) => set("showInNav", e.target.checked)}
          className="h-4 w-4 accent-[--brand]"
        />
        <span className="text-ink">Show in navigation</span>
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Nav label (optional)</span>
        <input value={meta.navLabel} onChange={(e) => set("navLabel", e.target.value)} className="field-premium" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Nav order</span>
        <input
          type="number"
          value={meta.navOrder}
          onChange={(e) => set("navOrder", e.target.value === "" ? 0 : Number(e.target.value))}
          className="field-premium"
        />
      </label>

      <hr className="border-[--hair]" />

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">SEO title</span>
        <input value={meta.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="field-premium" />
      </label>

      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">SEO description</span>
        <textarea
          rows={3}
          value={meta.seoDescription}
          onChange={(e) => set("seoDescription", e.target.value)}
          className="field-premium"
        />
      </label>
    </div>
  );
}

// Placeholder data so dynamic blocks preview with content in the editor.
const PREVIEW_CONTEXT = {
  classes: [
    { id: "p1", name: "Ballet — Beginners", discipline: "Ballet", level: "Beginner", stream: "Beginners", room: "Studio 1", dayOfWeek: 1, startTime: "16:00:00", endTime: "17:00:00", priceCents: 12000 },
    { id: "p2", name: "Contemporary", discipline: "Contemporary", level: "All levels", stream: "Juniors", room: "Studio 2", dayOfWeek: 2, startTime: "17:00:00", endTime: "18:00:00", priceCents: 14000 },
    { id: "p3", name: "Hip Hop Juniors", discipline: "Hip Hop", level: "Juniors", stream: "Juniors", room: "Studio 1", dayOfWeek: 3, startTime: "16:30:00", endTime: "17:30:00", priceCents: 11000 },
  ],
  scheduleClasses: [
    { id: "p1", name: "Ballet — Beginners", discipline: "Ballet", level: "Beginner", stream: "Beginners", room: "Studio 1", dayOfWeek: 1, startTime: "16:00:00", endTime: "17:00:00", priceCents: 12000 },
    { id: "p2", name: "Contemporary", discipline: "Contemporary", level: "All levels", stream: "Juniors", room: "Studio 2", dayOfWeek: 1, startTime: "17:00:00", endTime: "18:00:00", priceCents: 14000 },
  ],
  events: [
    { id: "e1", name: "Welcome!", description: "Tech is back in the mix!", eventDate: new Date().toISOString(), category: "news", imageUrl: null, venueName: null },
    { id: "e2", name: "Term 3 dates announced", description: "Classes resume Monday 14 July.", eventDate: new Date().toISOString(), category: "term_dates", imageUrl: null, venueName: null },
  ],
  products: [
    { id: "pr1", name: "Studio T-shirt", description: "Cotton tee with logo", priceCents: 3500, imageUrl: null, category: "Merchandise", stockQty: 10 },
    { id: "pr2", name: "Ballet leotard", description: "Required uniform", priceCents: 4500, imageUrl: null, category: "Uniform", stockQty: 5 },
  ],
  staff: [
    { id: "s1", name: "Jane Instructor", role: "Ballet Director", bio: "RAD certified with 20 years experience.", photoUrl: null },
    { id: "s2", name: "Alex Teacher", role: "Contemporary", bio: "Former company dancer.", photoUrl: null },
  ],
};
