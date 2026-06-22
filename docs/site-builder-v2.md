# Site Builder v2 — "Studio" (preview)

A ground-up rebuild of the website builder as a Webflow/Framer-class visual
canvas. It is **fully compartmentalized**: a new `lib/builder/*` engine, a new
`components/builder/*` UI, new routes under `/portal/admin/site/studio`, and a
dedicated `site_builder_documents` table. The v1 builder (`lib/site/*`,
`site_pages.blocks`, the public site renderer) is **never imported or modified**,
so v2 cannot regress the live site or the rest of the admin portal.

> Status: preview branch `preview/site-builder-v2`. Not wired into the public
> site rendering. Reachable from the site manager banner or directly at
> `/portal/admin/site/studio`.

---

## 1. The JSON document schema (deliverable #1)

`lib/builder/schema.ts` is the single source of truth. The document is a
**normalized graph**, not a nested tree:

```ts
BuilderDocument {
  version: 2
  rootId: NodeId
  nodes: Record<NodeId, BuilderNode>   // flat map — O(1) node updates
  theme: ThemeTokens                   // design tokens (pillar 5)
  breakpoints: Breakpoint[]            // desktop → mobile portrait
  collections: CmsCollection[]         // no-code relational CMS (pillar 4)
  meta: PageMeta
  cascade: "desktop-first" | "mobile-first"
}

BuilderNode {
  id; type; name; parent; children: NodeId[]
  style: StyleSet                                  // BASE (desktop) styles
  responsive?: Partial<Record<BreakpointId, Partial<StyleSet>>>  // overrides (pillar 2)
  states?: Partial<Record<"hover"|"active"|"focus", Partial<StyleSet>>>  // (pillar 6)
  props: NodeProps                                 // content (rich text, src, href…)
  binding?: CmsBinding                             // dynamic data (pillar 4)
  animation?: AnimationSpec                        // entrance/scroll/hover (pillar 6)
  locked?; hidden?
}
```

Why normalized? Because every editor mutation targets exactly one node. A flat
map means a write is `nodes[id] = …` — no tree walk, no deep clone. Combined
with Immer's structural sharing this is what keeps the canvas fast (see §2).

**Hybrid layout (pillar 1).** A node's `StyleSet.layout` is `flow | flex | grid |
absolute`. A container chooses how it arranges children; a child carries its own
`position`/`top`/`left`, so freeform absolute placement and semantic flex/grid
compose in the same tree. `lib/builder/cascade.ts#compileStyle` translates the
`StyleSet` (layout mode, box-edge shorthands, transforms, text gradients, token
refs) into a `React.CSSProperties`.

**Responsive (pillar 2).** `cascadeStyle()` folds the base + each breakpoint
override up to the active breakpoint. Desktop-first cascades wide→narrow; editing
on tablet writes only to `responsive.tablet`, leaving desktop untouched.

**Design tokens (pillar 5).** Style values may be a literal **or** a token
reference `{group.name}` (e.g. `{color.brand}`). `lib/builder/tokens.ts` emits the
theme as CSS custom properties (`--ds-color-brand`) and rewrites token refs to
`var(--ds-color-brand)`. Changing a token re-skins everything instantly with **no
React re-render and no layout shift** — the browser just recomputes the variable.

**Inline rich text (pillar 3).** `text` nodes store `props.rich: RichText` — an
array of blocks of styled runs. Per-run marks support color, gradient and
letter-spacing, so per-character styling round-trips losslessly (no HTML soup).

**CMS (pillar 4)** and **animation (pillar 6)** are first-class fields
(`CmsBinding`, `AnimationSpec`) on every node.

---

## 2. State-management strategy (deliverable #2)

`lib/builder/store.ts` — **Zustand + Immer**. Four mechanisms keep rapid drag /
typing lag-free:

1. **Normalized graph + structural sharing.** Immer's `produce` only allocates
   new objects along the mutated path. Every untouched node keeps its identity.
2. **Slice subscriptions.** Each `<NodeRenderer id>` selects `s.doc.nodes[id]`.
   Because unchanged nodes keep identity, `Object.is` equality means dragging
   node A re-renders **only** node A's renderer and the overlay bound to A.
3. **Transactions.** A drag or a text-editing session calls `beginTx()` once,
   fires many `transient` mutations (no history push), then `endTx()` records a
   **single** undo entry. Pointer moves never thrash history.
4. **Reference-snapshot history.** Undo/redo swap whole-document references;
   structural sharing makes each snapshot cheap, so a 100-deep stack is small.

Store surface: `select / setHover / setEditing`, `setBreakpoint / setMode /
setZoom`, `undo / redo / beginTx / endTx`, `insertComponent / deleteNodes /
duplicateNode / moveNode / reorder`, `updateStyle / setText / updateProps /
setBinding / setAnimation`, `setToken / setCascade`, `loadDocument / markSaved`.

`updateStyle(id, patch)` automatically targets the active breakpoint layer (or an
interaction-state layer), so the inspector "just works" on every breakpoint.

---

## 3. Core canvas boilerplate (deliverable #3)

`components/builder/NodeRenderer.tsx` parses a node and renders an interactive,
inline-editable, draggable element, recursing into `children`. It:

- resolves styles via `resolveStyle(node, { breakpoint, cascade })`,
- renders the correct element per `type` (frame → semantic tag, text →
  `RichTextView` or the `InlineText` WYSIWYG when editing, image/video/button/
  form/productLoop/booking…),
- wires selection (`onMouseDown`), hover, and double-click-to-edit,
- exposes `data-builder-node` / `data-builder-frame` for hit-testing,
- delegates entrance/scroll/hover animation to `AnimatedShell` (framer-motion)
  outside the editor.

Surrounding it: `CanvasViewport` (device frame at the breakpoint width, theme
vars injected, zoom, palette drop hit-testing), `SelectionOverlay` (bounding box,
8 resize handles, freeform drag, alignment-guide snapping), `Topbar` (breakpoint
switcher, history, zoom, preview toggle, cascade direction, save), `LeftPanel`
(insert palette + layers tree), `Inspector` (element / theme / page tabs).

`components/builder/PublicDocument.tsx` renders a document **without** the editor
store (store-independent recursion) so it is safe for SSR / shareable preview at
`/site-preview-v2/[pageId]`.

---

## Pillar → code map

| Pillar | Where |
| --- | --- |
| 1 Hybrid layout & drag | `StyleSet.layout`, `cascade.ts`, `SelectionOverlay.tsx`, `CanvasViewport` drop hit-testing |
| 2 Multi-breakpoint | `BREAKPOINTS`, `responsive`, `cascadeStyle()`, `Topbar` switcher |
| 3 Inline WYSIWYG | `RichText` model, `rich.ts`, `InlineText.tsx` floating toolbar |
| 4 Relational CMS | `CmsCollection` / `CmsBinding`, `Inspector` CMS section, Page tab |
| 5 Theme tokens | `ThemeTokens`, `tokens.ts`, `Inspector` Theme tab |
| 6 Animation & states | `AnimationSpec` / `states`, `AnimatedShell.tsx` |
| 7 App-market blocks | node types `form / input / productLoop / booking`, renderers in `NodeRenderer` |

---

## Persistence & isolation

- Migration `supabase/migrations/0057_site_builder_v2.sql` adds
  `site_builder_documents (page_id PK, studio_id, document jsonb, template_id)`
  with admin-RLS mirroring `site_pages`. **Run `npm run db:push` to apply.**
- Server actions: `app/portal/admin/site/studio/actions.ts`
  (`createStudioPage`, `saveBuilderDocument`, `deleteStudioPage`). v2 pages are
  created as **non-home, hidden, draft** `site_pages` rows so they can never
  affect the live site.
- Routes degrade gracefully if the table isn't provisioned (a banner prompts the
  migration; the editor falls back to an empty document).

## The 5 starter templates

`lib/builder/templates.ts`: **Aurora** (SaaS), **Atelier** (portfolio, freeform
hero), **Ledger** (editorial), **Pulse** (community + booking), **Market**
(commerce). Each ships its own theme to demonstrate one-click reskinning.

## Deliberate simplifications / next steps

- **WYSIWYG** uses a contenteditable surface (no TipTap/Slate dependency). The
  `RichText` model is editor-agnostic, so swapping in TipTap is localised to
  `InlineText.tsx`.
- **Responsive published output** currently resolves at one active breakpoint;
  production rendering should compile `responsive` overrides into a media-query
  stylesheet.
- **CMS** schema + binding UI exist; dynamic-page generation (one page per
  collection item) and a collection editor UI are the next build.
- **App-market blocks** render visually; form submission / cart / booking
  backends are stubs to be wired to existing server actions.
- **Canvas sibling reordering** is via the layers panel + absolute drag; in-flow
  drag-to-reorder with insertion indicators is a follow-up.
