export type MessageTopic = "billing" | "absence" | "general";

export const MESSAGE_TOPICS: MessageTopic[] = ["billing", "absence", "general"];

export function isMessageTopic(value: string | null | undefined): value is MessageTopic {
  return value != null && MESSAGE_TOPICS.includes(value as MessageTopic);
}

/** Normalise stored topic; legacy null parent-admin messages count as general. */
export function normalizeMessageTopic(topic: string | null | undefined): MessageTopic {
  return isMessageTopic(topic) ? topic : "general";
}

export function adminTopicThreadKey(topic: MessageTopic): string {
  return `admin:${topic}`;
}
