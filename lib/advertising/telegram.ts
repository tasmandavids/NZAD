const TELEGRAM_API = "https://api.telegram.org";

export type TelegramBotInfo = {
  id: number;
  username: string;
  firstName: string;
};

export type TelegramChannelInfo = {
  chatId: string;
  title: string;
  username: string | null;
  type: string;
};

function botApiUrl(token: string, method: string): string {
  return `${TELEGRAM_API}/bot${token}/${method}`;
}

export async function verifyTelegramBotToken(token: string): Promise<TelegramBotInfo> {
  const res = await fetch(botApiUrl(token, "getMe"));
  const json = (await res.json()) as {
    ok?: boolean;
    result?: { id: number; username?: string; first_name?: string };
    description?: string;
  };
  if (!res.ok || !json.ok || !json.result) {
    throw new Error(json.description ?? "Invalid bot token — check with @BotFather");
  }
  return {
    id: json.result.id,
    username: json.result.username ?? `bot${json.result.id}`,
    firstName: json.result.first_name ?? "Bot",
  };
}

export async function resolveTelegramChannel(
  token: string,
  channelInput: string,
): Promise<TelegramChannelInfo> {
  const chatId = channelInput.trim().startsWith("@")
    ? channelInput.trim()
    : channelInput.trim().startsWith("-")
      ? channelInput.trim()
      : `@${channelInput.trim().replace(/^@/, "")}`;

  const res = await fetch(botApiUrl(token, "getChat"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    result?: { id: number; title?: string; username?: string; type?: string };
    description?: string;
  };
  if (!res.ok || !json.ok || !json.result) {
    throw new Error(
      json.description ??
        "Cannot access channel — add your bot as an admin with post permission",
    );
  }
  return {
    chatId: String(json.result.id),
    title: json.result.title ?? chatId,
    username: json.result.username ?? null,
    type: json.result.type ?? "channel",
  };
}

export async function sendTelegramTestMessage(token: string, chatId: string): Promise<void> {
  const res = await fetch(botApiUrl(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: "✅ Olune connected! Your studio can now publish announcements here.",
      parse_mode: "HTML",
    }),
  });
  const json = (await res.json()) as { ok?: boolean; description?: string };
  if (!res.ok || !json.ok) {
    throw new Error(json.description ?? "Test message failed — check bot admin permissions");
  }
}

export async function publishToTelegram(
  token: string,
  chatId: string,
  campaign: {
    headline: string | null;
    bodyText: string | null;
    targetUrl: string | null;
    imageUrl: string | null;
  },
): Promise<string> {
  const textParts = [campaign.headline, campaign.bodyText].filter(Boolean);
  let text = textParts.join("\n\n");
  if (campaign.targetUrl) {
    text += `\n\n<a href="${campaign.targetUrl}">Learn more →</a>`;
  }

  if (campaign.imageUrl) {
    const res = await fetch(botApiUrl(token, "sendPhoto"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        photo: campaign.imageUrl,
        caption: text.slice(0, 1024),
        parse_mode: "HTML",
      }),
    });
    const json = (await res.json()) as {
      ok?: boolean;
      result?: { message_id?: number };
      description?: string;
    };
    if (!res.ok || !json.ok) {
      throw new Error(json.description ?? "Telegram photo publish failed");
    }
    return String(json.result?.message_id ?? Date.now());
  }

  const res = await fetch(botApiUrl(token, "sendMessage"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 4096),
      parse_mode: "HTML",
      disable_web_page_preview: false,
    }),
  });
  const json = (await res.json()) as {
    ok?: boolean;
    result?: { message_id?: number };
    description?: string;
  };
  if (!res.ok || !json.ok) {
    throw new Error(json.description ?? "Telegram publish failed");
  }
  return String(json.result?.message_id ?? Date.now());
}
