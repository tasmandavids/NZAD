import { describe, it, expect } from "vitest";
import { buildHeuristicSummary } from "@/lib/email/summarize";

describe("buildHeuristicSummary", () => {
  it("summarizes a short thread", () => {
    const summary = buildHeuristicSummary({
      subject: "Trial class enquiry",
      participants: ["parent@test.com", "studio@test.com"],
      messages: [
        {
          fromName: "Jane",
          fromAddress: "parent@test.com",
          bodyText: "Hi, can my daughter try ballet on Tuesday?",
          bodyHtml: null,
          sentAt: "2026-06-01T09:00:00Z",
          isOutbound: false,
        },
        {
          fromName: "Studio",
          fromAddress: "studio@test.com",
          bodyText: "Absolutely — we have space at 4pm.",
          bodyHtml: null,
          sentAt: "2026-06-01T10:00:00Z",
          isOutbound: true,
        },
      ],
    });

    expect(summary).toContain("2 messages");
    expect(summary).toContain("Trial class enquiry");
    expect(summary).toContain("Tuesday");
  });
});
