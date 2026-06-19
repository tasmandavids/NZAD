import { canonicalAppUrl } from "@/lib/app-url";

export const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "ads_management",
  "business_management",
].join(",");

export const TIKTOK_SCOPES = [
  "user.info.basic",
  "video.list",
  "video.upload",
  "video.publish",
].join(",");

export function metaAppId(): string | null {
  return process.env.META_APP_ID ?? null;
}

export function metaAppSecret(): string | null {
  return process.env.META_APP_SECRET ?? null;
}

export function tiktokAppId(): string | null {
  return process.env.TIKTOK_APP_ID ?? null;
}

export function tiktokAppSecret(): string | null {
  return process.env.TIKTOK_APP_SECRET ?? null;
}

export function isMetaConfigured(): boolean {
  return Boolean(metaAppId() && metaAppSecret());
}

export function isTiktokConfigured(): boolean {
  return Boolean(tiktokAppId() && tiktokAppSecret());
}

export function metaRedirectUri(origin?: string): string {
  if (process.env.NODE_ENV === "development" && origin) {
    return `${origin.replace(/\/$/, "")}/api/advertising/oauth/meta/callback`;
  }
  return `${canonicalAppUrl()}/api/advertising/oauth/meta/callback`;
}

export function tiktokRedirectUri(origin?: string): string {
  if (process.env.NODE_ENV === "development" && origin) {
    return `${origin.replace(/\/$/, "")}/api/advertising/oauth/tiktok/callback`;
  }
  return `${canonicalAppUrl()}/api/advertising/oauth/tiktok/callback`;
}

export const PLATFORM_META = {
  facebook: {
    label: "Facebook",
    color: "#1877F2",
    description: "Publish ads and posts to your Facebook Page",
    connectPath: "/api/advertising/oauth/meta/connect",
  },
  instagram: {
    label: "Instagram",
    color: "#E4405F",
    description: "Share ads and content to your Instagram Business account",
    connectPath: "/api/advertising/oauth/meta/connect",
  },
  tiktok: {
    label: "TikTok",
    color: "#000000",
    description: "Auto-publish video ads and organic posts to TikTok",
    connectPath: "/api/advertising/oauth/tiktok/connect",
  },
} as const;
