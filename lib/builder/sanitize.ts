// ============================================================================
//  lib/builder/sanitize.ts — conservative HTML sanitizer for `embed` nodes.
//
//  Once a builder document is published, an `embed` node's raw HTML is served to
//  ANONYMOUS visitors. Even though the author is an authenticated admin, that is
//  a stored-XSS surface (a compromised admin, or an admin pasting hostile
//  third-party "embed" code). This strips the script-injection vectors while
//  preserving benign markup and allowlisted embed iframes (YouTube, Vimeo, Maps…).
//
//  This is a defense-in-depth string pass, not a full DOM sanitizer — there is no
//  DOM server-side and we avoid pulling in a dependency. Hardening to DOMPurify
//  (or rendering embeds inside a sandboxed <iframe srcdoc>) is a follow-up.
// ============================================================================

/** Hosts whose <iframe src> is allowed to survive sanitization. */
const ALLOWED_IFRAME_HOSTS = [
  "youtube.com",
  "youtube-nocookie.com",
  "youtu.be",
  "player.vimeo.com",
  "vimeo.com",
  "google.com",
  "maps.google.com",
  "open.spotify.com",
  "w.soundcloud.com",
  "embed.music.apple.com",
  "calendly.com",
  "form.typeform.com",
  "docs.google.com",
];

function hostAllowed(src: string): boolean {
  try {
    const host = new URL(src, "https://placeholder.invalid").hostname.replace(/^www\./, "");
    return ALLOWED_IFRAME_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
}

export function sanitizeEmbedHtml(html: string | undefined | null): string {
  if (!html) return "";
  let out = html;

  // Drop tags that can execute or exfiltrate outright.
  out = out.replace(/<\/?(script|object|embed|link|meta|base|form|applet)\b[^>]*>/gi, "");

  // Strip inline event handlers (onclick, onerror, onload, …).
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");

  // Neutralize javascript:/vbscript:/data:text-html URLs in href/src.
  out = out.replace(
    /\b(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data)\s*:[^"']*\2/gi,
    "$1=$2#$2",
  );

  // Remove any <iframe> whose src host isn't allowlisted (keeps known embeds).
  out = out.replace(/<iframe\b[^>]*>/gi, (tag) => {
    const m = /\bsrc\s*=\s*("|')(.*?)\1/i.exec(tag);
    return m && hostAllowed(m[2]) ? tag : "<!-- embed: blocked iframe -->";
  });

  return out;
}
