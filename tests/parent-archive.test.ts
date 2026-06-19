import { describe, expect, it } from "vitest";
import { archiveThreadForParents, loadParentsByEmails } from "@/lib/email/parent-archive";

describe("parent-archive", () => {
  it("loadParentsByEmails returns empty map for no emails", async () => {
    const supabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              in: async () => ({ data: [] }),
            }),
          }),
        }),
      }),
    };
    const result = await loadParentsByEmails(supabase as never, "studio", []);
    expect(result.size).toBe(0);
  });

  it("archiveThreadForParents skips when no matching parents", async () => {
    const supabase = { from: () => ({ upsert: () => ({ select: () => ({ single: async () => ({}) }) }) }) };
    const count = await archiveThreadForParents(supabase as never, {
      studioId: "s",
      accountEmail: "studio@test.com",
      sourceThreadId: "t1",
      participants: ["other@test.com"],
      subject: "Hi",
      snippet: "Hello",
      lastMessageAt: null,
      messageCount: 1,
      messages: [],
      parentsByEmail: new Map(),
    });
    expect(count).toBe(0);
  });
});
