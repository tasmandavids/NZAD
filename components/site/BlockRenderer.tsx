// ============================================================================
//  components/site/BlockRenderer.tsx
//  Server component. Renders an ordered array of site-builder blocks using the
//  studio's branding tokens (--brand, --base, text-ink, etc.). Pure
//  presentation — no client JS. `classGrid` reads from the pre-fetched
//  `classes` passed by the page (avoids data-fetching inside the renderer).
// ============================================================================

import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { isOptimizableImageUrl } from "@/lib/images/optimizable";
import { formatMoney } from "@/lib/currency";
import { str, num, list, bool } from "@/lib/site/props";
import { APPEARANCE_DEFAULTS, type Block, type BlockProps, type BlockType } from "@/lib/site/blocks";
import { blockFrameClassName, blockFramePaddingClass, blockFrameStyle, blockOpacity, computeCanvasMinHeight, isStackLayout, usesCanvasLayout, usesStackLayout } from "@/lib/site/layout";
import { buttonStyleClasses, buttonStyleInline, ctaButtonClasses } from "@/lib/site/button-styles";
import {
  imageFitClass,
  imageFrameClasses,
  textColorStyle,
  typographyClasses,
} from "@/lib/site/block-styles";
import type { PageBackground } from "@/lib/site/background";
import { BackgroundShell } from "@/components/site/BackgroundShell";
import type { SiteClass, SiteEvent, SiteProduct, SiteStaff } from "@/lib/site/queries";
import type { RenderContext } from "@/lib/site/render-context";
import { ClassTabsBlock, ScheduleBlock } from "./blocks/ScheduleBlock";
import { NewsFeedBlock } from "./blocks/NewsFeedBlock";
import { ShopBlock } from "./blocks/ShopBlock";

export type { RenderContext } from "@/lib/site/render-context";

export function BlockRenderer({
  blocks,
  context,
  background,
  embedded = false,
}: {
  blocks: Block[];
  context: RenderContext;
  background?: PageBackground;
  /** When true, skip canvas layout (editor supplies positioning). */
  embedded?: boolean;
}) {
  if (!blocks.length) {
    return (
      <div className="grid min-h-[40vh] place-items-center px-6 text-center text-muted">
        <p>This page has no content yet.</p>
      </div>
    );
  }

  if (embedded) {
    return (
      <>
        {blocks.map((b) => (
          <BlockSwitch key={b.id} block={b} context={context} />
        ))}
      </>
    );
  }

  if (usesStackLayout(blocks) || !usesCanvasLayout(blocks)) {
    return (
      <div className="relative w-full">
        {background && <BackgroundShell background={background} />}
        {blocks.map((b) => (
          <div key={b.id} style={{ opacity: blockOpacity(b.props) }}>
            <BlockSwitch block={b} context={context} />
          </div>
        ))}
      </div>
    );
  }

  const minH = computeCanvasMinHeight(blocks);

  return (
    <div className="relative w-full" style={{ minHeight: minH }}>
      {background && <BackgroundShell background={background} />}
      <div className="relative" style={{ zIndex: 1, minHeight: minH }}>
        {blocks.map((b) =>
          isStackLayout(b.props) ? (
            <div key={b.id} style={{ opacity: blockOpacity(b.props) }}>
              <BlockSwitch block={b} context={context} />
            </div>
          ) : (
            <div key={b.id} style={blockFrameStyle(b.props)} className={blockFrameClassName(b.props)}>
              <div className={blockFramePaddingClass(b.props)}>
                <BlockSwitch block={b} context={context} />
              </div>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

function BlockSwitch({ block, context }: { block: Block; context: RenderContext }) {
  switch (block.type) {
    case "heading":      return <HeadingBlock p={block.props} />;
    case "paragraph":    return <ParagraphBlock p={block.props} />;
    case "imageBlock":   return <ImageBlock p={block.props} />;
    case "videoBlock":   return <VideoBlock p={block.props} />;
    case "linkBlock":    return <LinkBlock p={block.props} />;
    case "hero":         return <Hero p={block.props} />;
    case "pageHeader":   return <PageHeader p={block.props} />;
    case "statsRow":     return <StatsRow p={block.props} />;
    case "classStreams": return <ClassStreams p={block.props} />;
    case "classTabs":    return <ClassTabsBlock classes={context.classes} eyebrow={str(block.props, "eyebrow")} heading={str(block.props, "heading")} subheading={str(block.props, "subheading")} />;
    case "richText":     return <RichText p={block.props} />;
    case "features":     return <Features p={block.props} />;
    case "classGrid":    return <ClassGrid p={block.props} classes={context.classes} />;
    case "schedule":     return <Schedule p={block.props} classes={context.scheduleClasses} />;
    case "gallery":      return <Gallery p={block.props} />;
    case "testimonials": return <Testimonials p={block.props} />;
    case "newsFeed":     return <NewsFeed p={block.props} events={context.events} />;
    case "peopleGrid":   return <PeopleGrid p={block.props} staff={context.staff} />;
    case "shopGrid":     return <ShopGrid p={block.props} products={context.products} />;
    case "locations":    return <Locations p={block.props} />;
    case "cta":          return <Cta p={block.props} />;
    case "faq":          return <Faq p={block.props} />;
    case "contact":      return <Contact p={block.props} />;
    case "spacer":       return <SpacerBlock p={block.props} />;
    case "divider":      return <DividerBlock p={block.props} />;
    default:             return null;
  }
}

const WRAP = "mx-auto w-full max-w-5xl";

// ─── Appearance shell (per-block background + vertical spacing) ──────────────────
const SPACING: Record<string, string> = {
  compact: "py-10 sm:py-12",
  normal: "py-16 sm:py-20",
  spacious: "py-24 sm:py-32",
};

function BlockShell({
  p,
  type,
  className = "",
  children,
}: {
  p: BlockProps;
  type: BlockType;
  className?: string;
  children: ReactNode;
}) {
  const def = APPEARANCE_DEFAULTS[type] ?? { _bg: "base", _spacing: "normal" };
  const bg = str(p, "_bg", def._bg);
  const spacing = str(p, "_spacing", def._spacing);
  const bgClass = bg === "surface" ? "bg-surface" : "";
  const style =
    bg === "tint" ? { background: "color-mix(in srgb, var(--brand) 8%, var(--base))" } : undefined;
  return (
    <section className={`px-6 ${SPACING[spacing] ?? SPACING.normal} ${bgClass} ${className}`.trim()} style={style}>
      {children}
    </section>
  );
}

// ─── Markdown-lite inline + block rendering for the richText body ────────────────
//  Supports: blank-line paragraphs, `- `/`* ` bullets, `1. ` numbered lists,
//  **bold**, and [text](url) links. Deliberately tiny — no external dep.
function renderInline(text: string, kp: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`${kp}-b${i}`} className="font-semibold text-ink">
          {m[1]}
        </strong>,
      );
    } else if (m[2] !== undefined && m[3] !== undefined) {
      const href = m[3];
      const external = /^https?:\/\//.test(href);
      nodes.push(
        <Link
          key={`${kp}-l${i}`}
          href={href}
          className="text-brand underline underline-offset-2 transition hover:opacity-80"
          {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {m[2]}
        </Link>,
      );
    }
    last = m.index + m[0].length;
    i++;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function renderRichBody(body: string): ReactNode {
  const lines = body.split("\n");
  const out: ReactNode[] = [];
  let i = 0;
  let key = 0;
  const isBullet = (l: string) => /^\s*[-*]\s+/.test(l);
  const isNumber = (l: string) => /^\s*\d+\.\s+/.test(l);
  while (i < lines.length) {
    if (lines[i].trim() === "") {
      i++;
      continue;
    }
    if (isBullet(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && isBullet(lines[i])) items.push(lines[i++].replace(/^\s*[-*]\s+/, ""));
      const k = key++;
      out.push(
        <ul key={k} className="list-disc space-y-1 pl-6">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `u${k}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }
    if (isNumber(lines[i])) {
      const items: string[] = [];
      while (i < lines.length && isNumber(lines[i])) items.push(lines[i++].replace(/^\s*\d+\.\s+/, ""));
      const k = key++;
      out.push(
        <ol key={k} className="list-decimal space-y-1 pl-6">
          {items.map((it, idx) => (
            <li key={idx}>{renderInline(it, `o${k}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "" && !isBullet(lines[i]) && !isNumber(lines[i])) {
      para.push(lines[i++]);
    }
    const k = key++;
    out.push(<p key={k}>{renderInline(para.join(" "), `p${k}`)}</p>);
  }
  return out;
}

// ─── next/image: optimise our own Storage uploads; leave arbitrary URLs alone ────
function isOptimizable(url: string): boolean {
  return isOptimizableImageUrl(url);
}

/** Fills its (positioned, sized) parent. next/image for our Storage host,
 *  plain <img> for arbitrary pasted URLs (which aren't in remotePatterns). */
function FillImage({
  src,
  alt,
  sizes,
  fitClass = "object-cover",
}: {
  src: string;
  alt: string;
  sizes: string;
  fitClass?: string;
}) {
  if (isOptimizable(src)) {
    return <Image src={src} alt={alt} fill sizes={sizes} className={fitClass} />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} className={`absolute inset-0 h-full w-full ${fitClass}`} />;
}

// ─── Simple Wix-style elements ────────────────────────────────────────────────

function HeadingBlock({ p }: { p: BlockProps }) {
  const level = str(p, "level", "h2");
  const alignRaw = str(p, "align", "left");
  const align =
    alignRaw === "center" ? "text-center" : alignRaw === "right" ? "text-right" : "text-left";
  const text = str(p, "text", "Heading");
  const typo = typographyClasses(p);
  const levelSize =
    level === "h1"
      ? "text-4xl sm:text-5xl font-light"
      : level === "h3"
        ? "text-xl sm:text-2xl font-semibold"
        : "text-3xl sm:text-4xl font-bold";
  const className = `${str(p, "fontSize", "auto") === "auto" ? levelSize : ""} ${typo}`.trim();
  const style = { fontFamily: "var(--font-display)", ...textColorStyle(p) };
  return (
    <BlockShell p={p} type="heading">
      <div className={`${WRAP} ${align}`}>
        {level === "h1" ? (
          <h1 className={className} style={style}>{text}</h1>
        ) : level === "h3" ? (
          <h3 className={className} style={style}>{text}</h3>
        ) : (
          <h2 className={className} style={style}>{text}</h2>
        )}
      </div>
    </BlockShell>
  );
}

function ParagraphBlock({ p }: { p: BlockProps }) {
  const alignRaw = str(p, "align", "left");
  const align =
    alignRaw === "center" ? "text-center" : alignRaw === "right" ? "text-right" : "text-left";
  const body = str(p, "body");
  const typo = typographyClasses(p);
  return (
    <BlockShell p={p} type="paragraph">
      <div className={`${WRAP} ${align}`}>
        {body && (
          <div
            className={`space-y-4 leading-relaxed ${typo || "text-lg text-muted"} ${align === "text-center" ? "mx-auto max-w-2xl" : "max-w-3xl"}`}
            style={textColorStyle(p)}
          >
            {renderRichBody(body)}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

function ImageBlock({ p }: { p: BlockProps }) {
  const src = str(p, "imageUrl");
  const alt = str(p, "alt", "Image");
  const caption = str(p, "caption");
  const href = str(p, "linkHref");
  const fit = imageFitClass(p);
  const img = src ? (
    <div className={imageFrameClasses(p)}>
      <FillImage src={src} alt={alt} sizes="(max-width: 1024px) 100vw, 896px" fitClass={fit} />
    </div>
  ) : (
    <div className={`grid place-items-center border border-dashed border-[--hair] bg-surface text-sm text-muted ${imageFrameClasses(p)}`}>
      Add an image
    </div>
  );
  const content = href ? (
    <Link href={href} className="block transition hover:opacity-90">
      {img}
    </Link>
  ) : (
    img
  );
  return (
    <BlockShell p={p} type="imageBlock">
      <figure className={WRAP}>
        {content}
        {caption && <figcaption className="mt-2 text-center text-sm text-muted">{caption}</figcaption>}
      </figure>
    </BlockShell>
  );
}

function VideoBlock({ p }: { p: BlockProps }) {
  const src = str(p, "videoUrl");
  const poster = str(p, "posterUrl");
  const autoplay = bool(p, "autoplay");
  const loop = bool(p, "loop");
  const muted = bool(p, "muted", true) || autoplay;
  const controls = bool(p, "controls", true);

  return (
    <BlockShell p={p} type="videoBlock">
      <div className={WRAP}>
        {src ? (
          <video
            src={src}
            poster={poster || undefined}
            autoPlay={autoplay}
            loop={loop}
            muted={muted}
            controls={controls}
            playsInline
            className="aspect-video w-full rounded-2xl border border-[--hair] bg-black/5 object-cover"
          />
        ) : (
          <div className="grid aspect-video place-items-center rounded-2xl border border-dashed border-[--hair] bg-surface text-sm text-muted">
            Add a video
          </div>
        )}
      </div>
    </BlockShell>
  );
}

function LinkBlock({ p }: { p: BlockProps }) {
  const alignRaw = str(p, "align", "left");
  const align =
    alignRaw === "center" ? "justify-center" : alignRaw === "right" ? "justify-end" : "justify-start";
  const variant = str(p, "variant", "button");
  const label = str(p, "label", "Link");
  const href = str(p, "href", "#");
  const style = str(p, "buttonStyle", "solid");
  const size = str(p, "buttonSize", "md") as "sm" | "md" | "lg";
  return (
    <BlockShell p={p} type="linkBlock">
      <div className={`${WRAP} flex ${align}`}>
        {variant === "text" ? (
          <Link href={href} className="text-brand underline underline-offset-2 transition hover:opacity-80">
            {label}
          </Link>
        ) : (
          <Link
            href={href}
            className={buttonStyleClasses(style, size)}
            style={buttonStyleInline(style)}
          >
            {label}
          </Link>
        )}
      </div>
    </BlockShell>
  );
}

function heroOverlayClass(strength: string): string {
  switch (strength) {
    case "none":
      return "bg-transparent";
    case "dark":
      return "bg-gradient-to-b from-black/70 via-black/50 to-black/70";
    case "light":
      return "bg-gradient-to-b from-paper/70 via-ivory/60 to-paper/75";
    case "medium":
    default:
      return "bg-gradient-to-b from-paper/85 via-ivory/75 to-paper/90";
  }
}

function HeroButton({
  href,
  label,
  style,
  academy,
}: {
  href: string;
  label: string;
  style: string;
  academy: boolean;
}) {
  const academyExtra = academy ? "uppercase tracking-widest font-medium gap-2" : "";
  return (
    <Link
      href={href}
      className={`${buttonStyleClasses(style, academy ? "lg" : "md")} ${academyExtra}`}
      style={buttonStyleInline(style)}
    >
      {label}
      {academy && <span aria-hidden>→</span>}
    </Link>
  );
}

// ─── Hero (Academy full-bleed style from Base44 Home.jsx) ─────────────────────
function Hero({ p }: { p: BlockProps }) {
  const align = str(p, "align", "center") === "left" ? "items-start text-left" : "items-center text-center";
  const img = str(p, "imageUrl");
  const academy = str(p, "variant", "academy") === "academy";
  const minH = academy ? "min-h-[85vh] sm:min-h-screen" : "py-28 sm:py-36";
  const hasImg = !!img;
  const overlay = heroOverlayClass(str(p, "overlayStrength", hasImg ? "medium" : "none"));
  const primaryStyle = str(p, "primaryButtonStyle", academy ? "dark" : "solid");
  const secondaryStyle = str(p, "secondaryButtonStyle", "outline");

  return (
    <section
      className={`relative flex ${minH} items-center justify-center overflow-hidden px-6 bg-base`}
      style={
        hasImg
          ? { backgroundImage: `url(${img})`, backgroundSize: "cover", backgroundPosition: "center" }
          : undefined
      }
    >
      <div
        className={`absolute inset-0 ${
          hasImg ? overlay : "bg-gradient-to-b from-paper via-ivory to-paper"
        }`}
      />
      <div className={`relative z-10 mx-auto flex max-w-4xl flex-col gap-5 ${align}`}>
        {str(p, "eyebrow") && (
          <span className="text-xs font-semibold uppercase tracking-[0.35em] text-brand">
            {str(p, "eyebrow")}
          </span>
        )}
        <h1
          className={`font-light tracking-wide text-ink ${academy ? "text-5xl sm:text-7xl" : "text-4xl font-black sm:text-6xl"}`}
          style={{ fontFamily: "var(--font-display)" }}
        >
          {str(p, "heading")}
        </h1>
        {str(p, "subheading") && (
          <p className={`max-w-xl text-lg font-light text-muted ${academy ? "leading-relaxed" : ""}`}>
            {str(p, "subheading")}
          </p>
        )}
        <div className={`mt-2 flex flex-wrap gap-3 ${align.includes("center") ? "justify-center" : ""}`}>
          {str(p, "primaryLabel") && (
            <HeroButton
              href={str(p, "primaryHref", "#")}
              label={str(p, "primaryLabel")}
              style={primaryStyle}
              academy={academy}
            />
          )}
          {str(p, "secondaryLabel") && (
            <HeroButton
              href={str(p, "secondaryHref", "#")}
              label={str(p, "secondaryLabel")}
              style={secondaryStyle}
              academy={academy}
            />
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Page header (inner pages — Base44 About hero) ───────────────────────────
function PageHeader({ p }: { p: BlockProps }) {
  const align = str(p, "align", "center") === "left" ? "text-left" : "text-center";
  return (
    <BlockShell p={p} type="pageHeader" className="!py-0">
      <div className={`${WRAP} ${align}`}>
        {str(p, "eyebrow") && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.35em] text-brand-hot">
            {str(p, "eyebrow")}
          </p>
        )}
        <h1 className="text-4xl font-light text-ink sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
          {str(p, "heading")}
        </h1>
        {str(p, "subheading") && (
          <p className="mx-auto mt-3 max-w-2xl text-lg text-muted">{str(p, "subheading")}</p>
        )}
      </div>
    </BlockShell>
  );
}

// ─── Stats row (Base44 quick intro strip) ────────────────────────────────────
function StatsRow({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="statsRow" className="!bg-surface border-y border-[--hair]">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-2 gap-6 md:grid-cols-4">
        {items.map((it, i) => (
          <div key={i} className="text-center">
            <p className="text-xl font-light text-brand sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              {it.label}
            </p>
            <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted">{it.sublabel}</p>
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

// ─── Class streams (Base44 home category grid) ───────────────────────────────
function ClassStreams({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="classStreams">
      <div className={WRAP}>
        {str(p, "eyebrow") && (
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.35em] text-brand">
            {str(p, "eyebrow")}
          </p>
        )}
        {str(p, "heading") && (
          <h2 className="mb-10 text-center text-4xl font-light text-ink sm:text-5xl" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
          {items.map((it, i) => (
            <Link
              key={i}
              href={it.href || "/classes"}
              className="group relative aspect-[3/4] overflow-hidden bg-surface"
            >
              {it.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={it.imageUrl}
                  alt={it.title}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5">
                <p className="text-2xl font-light text-white" style={{ fontFamily: "var(--font-display)" }}>
                  {it.title}
                </p>
                <p className="text-xs tracking-wider text-brand-hot">{it.subtitle}</p>
              </div>
            </Link>
          ))}
        </div>
        {str(p, "viewAllLabel") && (
          <div className="mt-10 text-center">
            <Link
              href={str(p, "viewAllHref", "/classes")}
              className="border-b border-brand pb-1 text-sm font-semibold uppercase tracking-widest text-brand transition hover:text-brand-hot"
            >
              {str(p, "viewAllLabel")}
            </Link>
          </div>
        )}
      </div>
    </BlockShell>
  );
}

function Schedule({ p, classes }: { p: BlockProps; classes: SiteClass[] }) {
  return (
    <BlockShell p={p} type="schedule">
      <ScheduleBlock
        classes={classes}
        eyebrow={str(p, "eyebrow")}
        heading={str(p, "heading")}
        subheading={str(p, "subheading")}
        footnote={str(p, "footnote")}
      />
    </BlockShell>
  );
}

function NewsFeed({ p, events }: { p: BlockProps; events: SiteEvent[] }) {
  return (
    <BlockShell p={p} type="newsFeed">
      <NewsFeedBlock
        events={events}
        eyebrow={str(p, "eyebrow")}
        heading={str(p, "heading")}
        subheading={str(p, "subheading")}
        showFilters={bool(p, "showFilters", true)}
        viewAllLabel={str(p, "viewAllLabel")}
        viewAllHref={str(p, "viewAllHref")}
      />
    </BlockShell>
  );
}

function PeopleGrid({ p, staff }: { p: BlockProps; staff: SiteStaff[] }) {
  const source = str(p, "source", "staff");
  const manual = source === "manual" ? list(p, "items") : [];
  const people =
    source === "manual"
      ? manual.map((it, i) => ({
          id: `m${i}`,
          name: it.name,
          role: it.role,
          bio: it.bio,
          photoUrl: it.photoUrl,
        }))
      : staff;

  return (
    <BlockShell p={p} type="peopleGrid">
      <div className={WRAP}>
        {str(p, "eyebrow") && (
          <p className="mb-2 text-center text-xs font-semibold uppercase tracking-[0.35em] text-brand-hot">
            {str(p, "eyebrow")}
          </p>
        )}
        {str(p, "heading") && (
          <h2 className="text-center text-4xl font-light text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        {str(p, "subheading") && (
          <p className="mx-auto mt-3 max-w-2xl text-center text-muted">{str(p, "subheading")}</p>
        )}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {people.length === 0 ? (
            <p className="col-span-full text-center text-muted">Team members coming soon.</p>
          ) : (
            people.map((person) => (
              <div key={person.id} className="text-center">
                {person.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={person.photoUrl}
                    alt={person.name}
                    className="mx-auto mb-4 h-48 w-48 rounded-full object-cover"
                  />
                ) : (
                  <div className="mx-auto mb-4 flex h-48 w-48 items-center justify-center rounded-full bg-surface text-3xl font-light text-muted">
                    {person.name.charAt(0)}
                  </div>
                )}
                <h3 className="text-lg font-semibold text-ink">{person.name}</h3>
                {person.role && <p className="text-sm text-brand">{person.role}</p>}
                {person.bio && <p className="mt-2 text-sm text-muted">{person.bio}</p>}
              </div>
            ))
          )}
        </div>
      </div>
    </BlockShell>
  );
}

function ShopGrid({ p, products }: { p: BlockProps; products: SiteProduct[] }) {
  return (
    <BlockShell p={p} type="shopGrid">
      <ShopBlock
        products={products}
        eyebrow={str(p, "eyebrow")}
        heading={str(p, "heading")}
        subheading={str(p, "subheading")}
        showFilters={bool(p, "showFilters", true)}
        footnote={str(p, "footnote")}
      />
    </BlockShell>
  );
}

function Locations({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="locations">
      <div className={WRAP}>
        {str(p, "heading") && (
          <h2 className="mb-10 text-center text-3xl font-light text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-[--hair] bg-base p-6">
              <h3 className="text-lg font-semibold text-ink">{it.name}</h3>
              <p className="mt-1 text-sm text-muted">{it.detail}</p>
              {it.address && <p className="mt-3 whitespace-pre-line text-sm text-ink">{it.address}</p>}
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Rich text ─────────────────────────────────────────────────────────────────
function RichText({ p }: { p: BlockProps }) {
  const center = str(p, "align", "left") === "center";
  const body = str(p, "body");
  return (
    <BlockShell p={p} type="richText">
      <div className={`${WRAP} ${center ? "text-center" : ""}`}>
        {str(p, "heading") && (
          <h2 className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        {body && (
          <div className={`mt-4 space-y-4 text-lg leading-relaxed text-muted ${center ? "mx-auto max-w-2xl" : "max-w-3xl"}`}>
            {renderRichBody(body)}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

// ─── Features ──────────────────────────────────────────────────────────────────
function Features({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="features">
      <div className={WRAP}>
        {str(p, "heading") && (
          <h2 className="mb-10 text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <div key={i} className="rounded-2xl border border-[--hair] bg-base p-6">
              <div className="mb-3 text-2xl text-brand">{it.icon}</div>
              <h3 className="text-lg font-semibold text-ink">{it.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{it.text}</p>
            </div>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Class grid (data-driven) ───────────────────────────────────────────────────
function ClassGrid({ p, classes }: { p: BlockProps; classes: SiteClass[] }) {
  const limit = num(p, "limit", 6);
  const shown = classes.slice(0, limit);
  return (
    <BlockShell p={p} type="classGrid">
      <div className={WRAP}>
        <div className="mb-10 text-center">
          {str(p, "heading") && (
            <h2 className="text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
              {str(p, "heading")}
            </h2>
          )}
          {str(p, "subheading") && <p className="mt-2 text-muted">{str(p, "subheading")}</p>}
        </div>
        {shown.length === 0 ? (
          <p className="text-center text-muted">Classes coming soon.</p>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {shown.map((c) => (
              <div key={c.id} className="rounded-2xl border border-[--hair] bg-surface p-6">
                <h3 className="text-lg font-semibold text-ink">{c.name}</h3>
                <p className="mt-1 text-sm text-muted">
                  {[c.discipline, c.level].filter(Boolean).join(" · ") || "All levels"}
                </p>
                {c.priceCents > 0 && (
                  <p className="mt-4 text-sm font-semibold text-brand">{formatMoney(c.priceCents)} / month</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

// ─── Gallery ───────────────────────────────────────────────────────────────────
function Gallery({ p }: { p: BlockProps }) {
  const items = list(p, "items").filter((it) => it.imageUrl);
  return (
    <BlockShell p={p} type="gallery">
      <div className={WRAP}>
        {str(p, "heading") && (
          <h2 className="mb-10 text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        {items.length === 0 ? (
          <p className="text-center text-muted">Add image URLs to populate the gallery.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((it, i) => (
              <figure key={i} className="overflow-hidden rounded-2xl border border-[--hair]">
                <div className="relative h-56 w-full">
                  <FillImage
                    src={it.imageUrl}
                    alt={it.caption || ""}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                </div>
                {it.caption && <figcaption className="bg-surface px-3 py-2 text-xs text-muted">{it.caption}</figcaption>}
              </figure>
            ))}
          </div>
        )}
      </div>
    </BlockShell>
  );
}

// ─── Testimonials ──────────────────────────────────────────────────────────────
function Testimonials({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="testimonials">
      <div className={WRAP}>
        {str(p, "heading") && (
          <h2 className="mb-10 text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((it, i) => (
            <blockquote key={i} className="rounded-2xl border border-[--hair] bg-base p-6">
              <p className="text-lg italic leading-relaxed text-ink">“{it.quote}”</p>
              <footer className="mt-4 text-sm font-semibold text-brand">— {it.author}</footer>
            </blockquote>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── CTA ───────────────────────────────────────────────────────────────────────
function Cta({ p }: { p: BlockProps }) {
  const btnStyle = str(p, "buttonStyle", "white");
  return (
    <section className="px-6 py-20">
      <div
        className="mx-auto flex max-w-4xl flex-col items-center gap-5 rounded-3xl px-8 py-14 text-center"
        style={{ background: "linear-gradient(135deg, var(--brand), var(--brand-deep))" }}
      >
        <h2 className="text-3xl font-bold text-white sm:text-4xl" style={{ fontFamily: "var(--font-display)" }}>
          {str(p, "heading")}
        </h2>
        {str(p, "subheading") && <p className="max-w-xl text-white/85">{str(p, "subheading")}</p>}
        {str(p, "buttonLabel") && (
          <Link href={str(p, "buttonHref", "#")} className={ctaButtonClasses(btnStyle)}>
            {str(p, "buttonLabel")}
          </Link>
        )}
      </div>
    </section>
  );
}

// ─── FAQ ───────────────────────────────────────────────────────────────────────
function Faq({ p }: { p: BlockProps }) {
  const items = list(p, "items");
  return (
    <BlockShell p={p} type="faq">
      <div className="mx-auto w-full max-w-3xl">
        {str(p, "heading") && (
          <h2 className="mb-8 text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <div className="divide-y divide-[--hair] rounded-2xl border border-[--hair] bg-surface">
          {items.map((it, i) => (
            <details key={i} className="group p-5">
              <summary className="cursor-pointer list-none font-semibold text-ink marker:hidden">
                {it.question}
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-muted">{it.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </BlockShell>
  );
}

// ─── Spacer & divider ──────────────────────────────────────────────────────────

function SpacerBlock({ p }: { p: BlockProps }) {
  const h = num(p, "height", 80);
  const show = bool(p, "showLabel", false);
  return (
    <div
      className="w-full"
      style={{ height: h }}
      aria-hidden={!show}
    >
      {show && (
        <div className="flex h-full items-center justify-center rounded border border-dashed border-[--hair] text-xs text-muted">
          Spacer · {h}px
        </div>
      )}
    </div>
  );
}

function DividerBlock({ p }: { p: BlockProps }) {
  const style = str(p, "style", "hair");
  const width = num(p, "width", 100);
  const alignRaw = str(p, "align", "center");
  const justify =
    alignRaw === "left" ? "justify-start" : alignRaw === "right" ? "justify-end" : "justify-center";

  const lineClass =
    style === "brand"
      ? "border-brand bg-brand"
      : style === "thick"
        ? "border-ink/30 bg-ink/30"
        : style === "dashed"
          ? "border-[--hair] border-dashed bg-transparent"
          : "border-[--hair] bg-[--hair]";

  return (
    <BlockShell p={p} type="divider" className="!py-4">
      <div className={`${WRAP} flex ${justify}`}>
        <hr
          className={`h-0 w-full border-0 border-t-2 ${lineClass}`}
          style={{ width: `${Math.min(100, Math.max(10, width))}%` }}
        />
      </div>
    </BlockShell>
  );
}

// ─── Contact ───────────────────────────────────────────────────────────────────
function Contact({ p }: { p: BlockProps }) {
  const rows: Array<[string, string]> = [
    ["Address", str(p, "address")],
    ["Phone", str(p, "phone")],
    ["Email", str(p, "email")],
    ["Hours", str(p, "hours")],
  ];
  return (
    <BlockShell p={p} type="contact">
      <div className="mx-auto w-full max-w-2xl">
        {str(p, "heading") && (
          <h2 className="mb-8 text-center text-3xl font-bold text-ink" style={{ fontFamily: "var(--font-display)" }}>
            {str(p, "heading")}
          </h2>
        )}
        <dl className="space-y-4 rounded-2xl border border-[--hair] bg-base p-6">
          {rows.filter(([, v]) => v).map(([label, value]) => (
            <div key={label} className="flex flex-col gap-0.5 border-b border-[--hair] pb-3 last:border-0 last:pb-0">
              <dt className="text-xs font-semibold uppercase tracking-widest text-muted">{label}</dt>
              <dd className="whitespace-pre-line text-ink">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </BlockShell>
  );
}
