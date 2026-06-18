"use client";

// ============================================================================
//  PageEditor — Wix-style visual page builder.
//  Canvas-first: drag elements to reorder, right-click to add, click to edit.
// ============================================================================

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BLOCK_LIBRARY,
  BLOCK_MAP,
  LAYOUT_FIELDS,
  cloneBlock,
  makeBlock,
  type Block,
  type BlockItem,
  type BlockType,
  type FieldDef,
  type PropValue,
} from "@/lib/site/blocks";
import ImageInput from "@/components/admin/site/ImageInput";
import VideoInput from "@/components/admin/site/VideoInput";
import { BackgroundEditor } from "@/components/admin/site/BackgroundEditor";
import { EditorCanvas } from "@/components/admin/site/EditorCanvas";
import { normalizePageBackground, type PageBackground } from "@/lib/site/background";
import { freeformDefaultsAt, nextCanvasY, seedLayoutProps } from "@/lib/site/layout";
import { num } from "@/lib/site/props";
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
  background: PageBackground;
};

function seedBlocks(blocks: Block[]): Block[] {
  return blocks.map((b, i) => ({ ...b, props: seedLayoutProps(b.props, i) }));
}

export default function PageEditor({ page }: { page: EditablePage }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [blocks, setBlocks] = useState<Block[]>(() => seedBlocks(page.blocks));
  const [background, setBackground] = useState<PageBackground>(() => normalizePageBackground(page.background));
  const [selectedId, setSelectedId] = useState<string | null>(page.blocks[0]?.id ?? null);
  const [backgroundSelected, setBackgroundSelected] = useState(false);
  const [panel, setPanel] = useState<"none" | "edit" | "settings" | "elements" | "background">("edit");
  const [status, setStatus] = useState<"draft" | "published">(page.status);
  const [dirty, setDirty] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  useEffect(() => {
    if (selectedId) {
      setBackgroundSelected(false);
      setPanel((p) => (p === "settings" || p === "background" ? p : "edit"));
    }
  }, [selectedId]);

  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const confirmLeave = (e: React.MouseEvent) => {
    if (dirty && !window.confirm("You have unsaved changes. Leave this page?")) e.preventDefault();
  };

  const addBlockAt = (type: BlockType, index: number, at?: { x: number; y: number }) => {
    const b = makeBlock(type);
    const width = type === "heading" || type === "paragraph" || type === "linkBlock" ? 50 : 70;
    const y = at?.y ?? nextCanvasY(blocks);
    const x = at?.x ?? 5;
    Object.assign(b.props, freeformDefaultsAt(y, width));
    b.props._x = x;
    b.props._zIndex = blocks.length + 1;
    setBlocks((prev) => {
      const next = [...prev];
      next.splice(index, 0, b);
      return next;
    });
    setSelectedId(b.id);
    setPanel("edit");
    touch();
  };

  const moveBlock = (id: string, patch: { _x?: number; _y?: number }) => {
    setBlocks((prev) =>
      prev.map((b) => (b.id === id ? { ...b, props: { ...b.props, ...patch } } : b)),
    );
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
      copy.props._y = num(copy.props, "_y", 0) + 24;
      copy.props._x = num(copy.props, "_x", 5) + 2;
      copy.props._zIndex = prev.length + 1;
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      setSelectedId(copy.id);
      return next;
    });
    touch();
  };

  const setProp = (key: string, value: PropValue) => {
    if (!selected) return;
    setBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== selected.id) return b;
        const props = { ...b.props, [key]: value };
        if (key === "autoplay" && value === true) props.muted = true;
        return { ...b, props };
      }),
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
  const removeItem = (key: string, index: number) => setProp(key, getList(key).filter((_, i) => i !== index));

  const moveItem = (key: string, index: number, dir: -1 | 1) => {
    const arr = [...getList(key)];
    const j = index + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[index], arr[j]] = [arr[j], arr[index]];
    setProp(key, arr);
  };

  const save = () =>
    startTransition(async () => {
      setMsg(null);
      const metaRes = await updatePageMeta({ pageId: page.id, ...meta });
      if (!metaRes.ok) return setMsg(metaRes.error);
      const res = await savePageBlocks(page.id, blocks, background);
      if (!res.ok) return setMsg(res.error);
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
      const blkRes = await savePageBlocks(page.id, blocks, background);
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
  const showPanel = panel !== "none";

  return (
    <div className="flex h-[100dvh] flex-col">
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
            type="button"
            onClick={() => setPanel((p) => (p === "elements" ? "none" : "elements"))}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              panel === "elements" ? "border-brand bg-brand/10 text-brand" : "border-[--hair] text-ink hover:bg-base"
            }`}
          >
            + Add
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedId(null);
              setBackgroundSelected(true);
              setPanel("background");
            }}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              panel === "background" ? "border-brand bg-brand/10 text-brand" : "border-[--hair] text-ink hover:bg-base"
            }`}
          >
            Background
          </button>
          <button
            type="button"
            onClick={() => setPanel((p) => (p === "settings" ? "none" : "settings"))}
            className={`rounded-full border px-4 py-1.5 text-sm transition ${
              panel === "settings" ? "border-brand bg-brand/10 text-brand" : "border-[--hair] text-ink hover:bg-base"
            }`}
          >
            Settings
          </button>
          <Link href={publicHref} target="_blank" className="rounded-full border border-[--hair] px-4 py-1.5 text-sm text-ink transition hover:bg-base">
            Preview
          </Link>
          <button onClick={save} disabled={pending} className="rounded-full border border-[--hair] px-4 py-1.5 text-sm font-medium text-ink transition hover:bg-base disabled:opacity-50">
            {pending ? "Saving…" : "Save draft"}
          </button>
          <button onClick={saveAndPublish} disabled={pending} className="rounded-full bg-brand px-4 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50">
            Publish
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 overflow-y-auto">
          <EditorCanvas
            blocks={blocks}
            background={background}
            backgroundSelected={backgroundSelected}
            selectedId={selectedId}
            onSelect={(id) => {
              setSelectedId(id);
              setBackgroundSelected(false);
            }}
            onSelectBackground={() => {
              setSelectedId(null);
              setBackgroundSelected(true);
              setPanel("background");
            }}
            onAddAt={addBlockAt}
            onDelete={deleteBlock}
            onDuplicate={duplicateBlock}
            onMoveBlock={moveBlock}
          />
        </main>

        {showPanel && (
          <aside className="flex w-[340px] shrink-0 flex-col overflow-y-auto border-l border-[--hair] bg-base">
            {panel === "settings" ? (
              <PageSettings meta={meta} isHome={page.isHome} onChange={(m) => { setMeta(m); touch(); }} />
            ) : panel === "background" ? (
              <BackgroundEditor
                background={background}
                onChange={(bg) => {
                  setBackground(bg);
                  touch();
                }}
              />
            ) : panel === "elements" ? (
              <ElementsPanel onAdd={(type) => addBlockAt(type, blocks.length)} />
            ) : selected ? (
              <Inspector
                key={selected.id}
                block={selected}
                fields={BLOCK_MAP[selected.type].fields}
                onSet={setProp}
                list={{ get: getList, update: updateItem, add: addItem, remove: removeItem, move: moveItem }}
              />
            ) : (
              <div className="p-6 text-center text-sm text-muted">
                <p>Click an element on the page to edit it.</p>
                <p className="mt-2 text-xs">Or right-click the canvas to add heading, text, image, or link.</p>
              </div>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function ElementsPanel({ onAdd }: { onAdd: (type: BlockType) => void }) {
  return (
    <div className="space-y-4 p-4">
      <h2 className="text-xs font-semibold uppercase tracking-widest text-muted">Add element</h2>
      <p className="text-xs text-muted">Click to add at the bottom of the page, or right-click the canvas to insert in a specific spot.</p>
      <div className="grid grid-cols-2 gap-2">
        {BLOCK_LIBRARY.map((def) => (
          <button
            key={def.type}
            type="button"
            onClick={() => onAdd(def.type)}
            title={def.description}
            className="rounded-lg border border-[--hair] bg-surface px-2 py-2.5 text-left text-xs text-ink transition hover:border-brand"
          >
            {def.label}
          </button>
        ))}
      </div>
    </div>
  );
}

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
  return (
    <div className="space-y-4 p-4">
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">{BLOCK_MAP[block.type].label}</h3>
      {fields.map((f) =>
        f.type === "list" ? (
          <ListField key={f.key} field={f} list={list} />
        ) : (
          <ScalarField key={f.key} field={f} value={block.props[f.key]} onSet={onSet} />
        ),
      )}
      <hr className="border-[--hair]" />
      <h4 className="text-xs font-semibold uppercase tracking-widest text-muted">Position & opacity</h4>
      {LAYOUT_FIELDS.map((f) => (
        <ScalarField key={f.key} field={f} value={block.props[f.key]} onSet={onSet} />
      ))}
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
      ) : field.type === "video" ? (
        <VideoInput value={str} onChange={(url) => onSet(field.key, url)} />
      ) : field.type === "select" ? (
        <select value={str} onChange={(e) => onSet(field.key, e.target.value)} className="field-premium">
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      ) : field.type === "textarea" && field.toolbar ? (
        <RichTextArea value={str} placeholder={field.placeholder} onChange={(v) => onSet(field.key, v)} />
      ) : field.type === "textarea" ? (
        <textarea value={str} rows={4} placeholder={field.placeholder} onChange={(e) => onSet(field.key, e.target.value)} className="field-premium" />
      ) : field.type === "boolean" ? (
        <input type="checkbox" checked={value === true} onChange={(e) => onSet(field.key, e.target.checked)} className="h-4 w-4 accent-[--brand]" />
      ) : field.type === "number" ? (
        <input type="number" value={str} onChange={(e) => onSet(field.key, e.target.value === "" ? 0 : Number(e.target.value))} className="field-premium" />
      ) : (
        <input type="text" value={str} placeholder={field.placeholder} onChange={(e) => onSet(field.key, e.target.value)} className="field-premium" />
      )}
      {field.help && <span className="mt-1 block text-xs text-muted">{field.help}</span>}
    </label>
  );
}

function RichTextArea({ value, placeholder, onChange }: { value: string; placeholder?: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
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

  const wrap = (token: string, fallback: string) => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const sel = value.slice(s, e) || fallback;
    const next = value.slice(0, s) + token + sel + token + value.slice(e);
    apply(next, s + token.length, s + token.length + sel.length);
  };

  const insertLink = () => {
    const el = ref.current;
    if (!el) return;
    const s = el.selectionStart;
    const e = el.selectionEnd;
    const text = value.slice(s, e) || "link text";
    const url = "https://";
    const inserted = `[${text}](${url})`;
    const next = value.slice(0, s) + inserted + value.slice(e);
    const urlStart = s + 1 + text.length + 2;
    apply(next, urlStart, urlStart + url.length);
  };

  const btn = "rounded-md border border-[--hair] bg-surface px-2 py-1 text-xs font-medium text-ink transition hover:border-brand hover:text-brand";

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={() => wrap("**", "bold text")} title="Bold" className={`${btn} font-bold`}>B</button>
        <button type="button" onClick={insertLink} title="Insert link" className={btn}>🔗 Link</button>
      </div>
      <textarea ref={ref} value={value} rows={6} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="field-premium font-mono text-xs leading-relaxed" />
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
        <div key={i} className="space-y-2 rounded-lg border border-[--hair] bg-surface p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted">Item {i + 1}</span>
            <span className="flex items-center gap-1">
              <button type="button" onClick={() => list.move(field.key, i, -1)} className="px-1 text-xs text-muted hover:text-ink">↑</button>
              <button type="button" onClick={() => list.move(field.key, i, 1)} className="px-1 text-xs text-muted hover:text-ink">↓</button>
              <button type="button" onClick={() => list.remove(field.key, i)} className="px-1 text-xs text-red-500">✕</button>
            </span>
          </div>
          {itemFields.map((itf) => (
            <label key={itf.key} className="block text-xs">
              <span className="mb-0.5 block text-muted">{itf.label}</span>
              {itf.type === "image" ? (
                <ImageInput value={item[itf.key] ?? ""} onChange={(url) => list.update(field.key, i, itf.key, url)} />
              ) : itf.type === "textarea" ? (
                <textarea rows={2} value={item[itf.key] ?? ""} onChange={(e) => list.update(field.key, i, itf.key, e.target.value)} className="field-premium" />
              ) : (
                <input type="text" value={item[itf.key] ?? ""} onChange={(e) => list.update(field.key, i, itf.key, e.target.value)} className="field-premium" />
              )}
            </label>
          ))}
        </div>
      ))}
      <button type="button" onClick={() => list.add(field.key, field.itemDefault ?? {})} className="w-full rounded-lg border border-dashed border-[--hair] py-2 text-xs text-muted transition hover:border-brand hover:text-ink">
        + Add item
      </button>
    </div>
  );
}

type Meta = {
  title: string;
  slug: string;
  navLabel: string;
  showInNav: boolean;
  navOrder: number;
  seoTitle: string;
  seoDescription: string;
};

function PageSettings({ meta, isHome, onChange }: { meta: Meta; isHome: boolean; onChange: (m: Meta) => void }) {
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
        <input value={isHome ? "home" : meta.slug} disabled={isHome} onChange={(e) => set("slug", e.target.value)} className="field-premium disabled:opacity-60" />
        <span className="mt-1 block text-xs text-muted">{isHome ? "The homepage always lives at /." : `Public URL: /${meta.slug}`}</span>
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={meta.showInNav} onChange={(e) => set("showInNav", e.target.checked)} className="h-4 w-4 accent-[--brand]" />
        <span className="text-ink">Show in navigation</span>
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Nav label (optional)</span>
        <input value={meta.navLabel} onChange={(e) => set("navLabel", e.target.value)} className="field-premium" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">Nav order</span>
        <input type="number" value={meta.navOrder} onChange={(e) => set("navOrder", e.target.value === "" ? 0 : Number(e.target.value))} className="field-premium" />
      </label>
      <hr className="border-[--hair]" />
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">SEO title</span>
        <input value={meta.seoTitle} onChange={(e) => set("seoTitle", e.target.value)} className="field-premium" />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-ink">SEO description</span>
        <textarea rows={3} value={meta.seoDescription} onChange={(e) => set("seoDescription", e.target.value)} className="field-premium" />
      </label>
    </div>
  );
}
