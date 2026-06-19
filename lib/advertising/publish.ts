import type { SupabaseClient } from "@supabase/supabase-js";
import { decryptSocialCredentials } from "./crypto";
import type { AdCampaign, SocialPlatform } from "./types";

type PublishResult = {
  platformIds: Record<string, string>;
  errors: Partial<Record<SocialPlatform, string>>;
};

async function publishToFacebook(
  accessToken: string,
  pageId: string,
  campaign: Pick<AdCampaign, "headline" | "bodyText" | "targetUrl" | "imageUrl">,
): Promise<string> {
  const message = [campaign.headline, campaign.bodyText].filter(Boolean).join("\n\n");
  const body: Record<string, string> = {
    message,
    access_token: accessToken,
  };
  if (campaign.targetUrl) body.link = campaign.targetUrl;
  if (campaign.imageUrl) body.url = campaign.imageUrl;

  const res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  const json = (await res.json()) as { id?: string; error?: { message: string } };
  if (!res.ok || !json.id) {
    throw new Error(json.error?.message ?? "Facebook publish failed");
  }
  return json.id;
}

async function publishToInstagram(
  accessToken: string,
  igUserId: string,
  campaign: Pick<AdCampaign, "bodyText" | "imageUrl">,
): Promise<string> {
  if (!campaign.imageUrl) {
    throw new Error("Instagram requires an image URL for publishing");
  }

  const createRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image_url: campaign.imageUrl,
      caption: campaign.bodyText ?? "",
      access_token: accessToken,
    }),
  });
  const createJson = (await createRes.json()) as { id?: string; error?: { message: string } };
  if (!createRes.ok || !createJson.id) {
    throw new Error(createJson.error?.message ?? "Instagram media creation failed");
  }

  const publishRes = await fetch(`https://graph.facebook.com/v21.0/${igUserId}/media_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      creation_id: createJson.id,
      access_token: accessToken,
    }),
  });
  const publishJson = (await publishRes.json()) as { id?: string; error?: { message: string } };
  if (!publishRes.ok || !publishJson.id) {
    throw new Error(publishJson.error?.message ?? "Instagram publish failed");
  }
  return publishJson.id;
}

async function publishToTiktok(
  accessToken: string,
  campaign: Pick<AdCampaign, "bodyText" | "videoUrl">,
): Promise<string> {
  if (!campaign.videoUrl) {
    throw new Error("TikTok requires a video URL for publishing");
  }

  const initRes = await fetch("https://open.tiktokapis.com/v2/post/publish/video/init/", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      post_info: {
        title: campaign.bodyText?.slice(0, 150) ?? "",
        privacy_level: "PUBLIC_TO_EVERYONE",
      },
      source_info: {
        source: "PULL_FROM_URL",
        video_url: campaign.videoUrl,
      },
    }),
  });

  const initJson = (await initRes.json()) as {
    data?: { publish_id?: string };
    error?: { message?: string };
  };
  if (!initRes.ok || !initJson.data?.publish_id) {
    throw new Error(initJson.error?.message ?? "TikTok publish init failed");
  }
  return initJson.data.publish_id;
}

export async function publishCampaignToPlatforms(
  supabase: SupabaseClient,
  studioId: string,
  campaign: AdCampaign,
): Promise<PublishResult> {
  const platformIds: Record<string, string> = {};
  const errors: Partial<Record<SocialPlatform, string>> = {};

  const { data: connections } = await supabase
    .from("social_connections")
    .select("platform, credentials_encrypted, account_id, settings")
    .eq("studio_id", studioId)
    .in("platform", campaign.platforms);

  const connMap = new Map(
    (connections ?? []).map((c) => [c.platform as SocialPlatform, c]),
  );

  for (const platform of campaign.platforms) {
    const conn = connMap.get(platform);
    if (!conn) {
      errors[platform] = "Platform not connected";
      continue;
    }

    try {
      const creds = decryptSocialCredentials(conn.credentials_encrypted as string);
      const settings = (conn.settings ?? {}) as Record<string, string>;

      if (platform === "facebook") {
        const pageId = settings.pageId ?? conn.account_id;
        if (!pageId) throw new Error("No Facebook Page selected");
        platformIds.facebook = await publishToFacebook(creds.accessToken, pageId, campaign);
      } else if (platform === "instagram") {
        const igUserId = settings.igUserId ?? conn.account_id;
        if (!igUserId) throw new Error("No Instagram account linked");
        platformIds.instagram = await publishToInstagram(creds.accessToken, igUserId, campaign);
      } else if (platform === "tiktok") {
        platformIds.tiktok = await publishToTiktok(creds.accessToken, campaign);
      }
    } catch (err) {
      errors[platform] = err instanceof Error ? err.message : "Publish failed";
    }
  }

  return { platformIds, errors };
}

export async function exchangeMetaCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; expiresIn: number }> {
  const appId = process.env.META_APP_ID;
  const appSecret = process.env.META_APP_SECRET;
  if (!appId || !appSecret) throw new Error("Meta OAuth not configured");

  const params = new URLSearchParams({
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri,
    code,
  });

  const res = await fetch(`https://graph.facebook.com/v21.0/oauth/access_token?${params}`);
  const json = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: { message: string };
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error?.message ?? "Meta token exchange failed");
  }
  return { accessToken: json.access_token, expiresIn: json.expires_in ?? 3600 };
}

export async function fetchMetaPages(accessToken: string): Promise<
  { id: string; name: string; igUserId?: string }[]
> {
  const res = await fetch(
    `https://graph.facebook.com/v21.0/me/accounts?fields=id,name,instagram_business_account&access_token=${accessToken}`,
  );
  const json = (await res.json()) as {
    data?: { id: string; name: string; instagram_business_account?: { id: string } }[];
    error?: { message: string };
  };
  if (!res.ok) throw new Error(json.error?.message ?? "Failed to fetch Facebook pages");
  return (json.data ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    igUserId: p.instagram_business_account?.id,
  }));
}

export async function exchangeTiktokCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; openId: string; expiresIn: number }> {
  const clientKey = process.env.TIKTOK_APP_ID;
  const clientSecret = process.env.TIKTOK_APP_SECRET;
  if (!clientKey || !clientSecret) throw new Error("TikTok OAuth not configured");

  const res = await fetch("https://open.tiktokapis.com/v2/oauth/token/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_key: clientKey,
      client_secret: clientSecret,
      code,
      grant_type: "authorization_code",
      redirect_uri: redirectUri,
    }),
  });

  const json = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    open_id?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !json.access_token) {
    throw new Error(json.error_description ?? "TikTok token exchange failed");
  }
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? "",
    openId: json.open_id ?? "",
    expiresIn: json.expires_in ?? 86400,
  };
}

export function buildMetaOAuthUrl(redirectUri: string, state: string): string {
  const appId = process.env.META_APP_ID;
  if (!appId) throw new Error("META_APP_ID not configured");
  const params = new URLSearchParams({
    client_id: appId,
    redirect_uri: redirectUri,
    state,
    scope: "pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,ads_management,business_management",
    response_type: "code",
  });
  return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
}

export function buildTiktokOAuthUrl(redirectUri: string, state: string): string {
  const clientKey = process.env.TIKTOK_APP_ID;
  if (!clientKey) throw new Error("TIKTOK_APP_ID not configured");
  const params = new URLSearchParams({
    client_key: clientKey,
    redirect_uri: redirectUri,
    state,
    scope: "user.info.basic,video.list,video.upload,video.publish",
    response_type: "code",
  });
  return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
}
