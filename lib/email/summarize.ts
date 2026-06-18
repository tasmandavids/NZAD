type SummaryInput = {
  subject: string | null;
  participants: string[];
  messages: {
    fromName: string | null;
    fromAddress: string | null;
    bodyText: string | null;
    bodyHtml: string | null;
    sentAt: string | null;
    isOutbound: boolean;
  }[];
};

function stripHtml(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function messageBody(msg: SummaryInput["messages"][0]): string {
  if (msg.bodyText?.trim()) return msg.bodyText.trim();
  if (msg.bodyHtml?.trim()) return stripHtml(msg.bodyHtml);
  return "";
}

export function buildHeuristicSummary(input: SummaryInput): string {
  const { subject, participants, messages } = input;
  if (messages.length === 0) return "No messages in this conversation yet.";

  const sorted = [...messages].sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const names = participants.slice(0, 4).join(", ");
  const more = participants.length > 4 ? ` +${participants.length - 4} more` : "";

  const bullets: string[] = [];
  bullets.push(
    `${messages.length} message${messages.length === 1 ? "" : "s"} between ${names}${more}.`,
  );
  if (subject) bullets.push(`Subject: ${subject}.`);

  const latestBody = messageBody(last);
  if (latestBody) {
    bullets.push(`Latest (${last.fromName ?? last.fromAddress ?? "Unknown"}): ${latestBody.slice(0, 180)}${latestBody.length > 180 ? "…" : ""}`);
  }

  const firstBody = messageBody(first);
  if (firstBody && first !== last) {
    bullets.push(`Started with: ${firstBody.slice(0, 120)}${firstBody.length > 120 ? "…" : ""}`);
  }

  return bullets.join("\n");
}

export async function summarizeConversation(input: SummaryInput): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return buildHeuristicSummary(input);

  const transcript = input.messages
    .sort((a, b) => (a.sentAt ?? "").localeCompare(b.sentAt ?? ""))
    .map((m) => {
      const who = m.fromName ?? m.fromAddress ?? "Unknown";
      const body = messageBody(m).slice(0, 800);
      return `[${m.sentAt ?? "unknown"}] ${who}:\n${body}`;
    })
    .join("\n\n");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Summarize this email thread for a dance studio owner. Be concise: 3-5 bullet points covering who is involved, what they want, status, and any action needed. Use plain language.",
        },
        {
          role: "user",
          content: `Subject: ${input.subject ?? "(no subject)"}\nParticipants: ${input.participants.join(", ")}\n\n${transcript}`,
        },
      ],
    }),
  });

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    error?: { message?: string };
  };
  if (!res.ok) {
    return buildHeuristicSummary(input);
  }
  return json.choices?.[0]?.message?.content?.trim() || buildHeuristicSummary(input);
}
