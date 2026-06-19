import type { SeoPageSnapshot, SeoRecommendation } from "./types";

type SeoAuditInput = {
  studioName: string;
  siteUrl: string | null;
  pages: SeoPageSnapshot[];
  focusPageId?: string | null;
};

function scorePage(page: SeoPageSnapshot): { score: number; issues: SeoRecommendation[] } {
  const issues: SeoRecommendation[] = [];
  let score = 100;

  if (!page.seoTitle?.trim()) {
    score -= 25;
    issues.push({
      id: `${page.id}-title`,
      priority: "high",
      category: "Meta title",
      title: "Missing SEO title",
      description: `"${page.title}" has no custom SEO title. Search engines will guess from page content.`,
      suggestedFix: `${page.title} | ${page.isHome ? "Dance Studio" : "Classes & Events"}`,
    });
  } else if (page.seoTitle.length < 30) {
    score -= 10;
    issues.push({
      id: `${page.id}-title-short`,
      priority: "medium",
      category: "Meta title",
      title: "SEO title is short",
      description: "Titles under 30 characters miss keyword opportunities.",
      suggestedFix: page.seoTitle + " — Enrol Today",
    });
  } else if (page.seoTitle.length > 60) {
    score -= 8;
    issues.push({
      id: `${page.id}-title-long`,
      priority: "medium",
      category: "Meta title",
      title: "SEO title may truncate in search results",
      description: "Google typically displays ~50–60 characters.",
      suggestedFix: page.seoTitle.slice(0, 57) + "…",
    });
  }

  if (!page.seoDescription?.trim()) {
    score -= 25;
    issues.push({
      id: `${page.id}-desc`,
      priority: "high",
      category: "Meta description",
      title: "Missing meta description",
      description: "Without a description, click-through rates from search tend to be lower.",
      suggestedFix: `Discover ${page.title.toLowerCase()} — classes, schedules, and enrolment info.`,
    });
  } else if (page.seoDescription.length < 120) {
    score -= 10;
    issues.push({
      id: `${page.id}-desc-short`,
      priority: "medium",
      category: "Meta description",
      title: "Meta description is short",
      description: "Aim for 120–160 characters with a clear call to action.",
    });
  }

  if (page.status !== "published") {
    score -= 15;
    issues.push({
      id: `${page.id}-draft`,
      priority: "low",
      category: "Visibility",
      title: "Page is not published",
      description: "Draft pages are not indexed by search engines.",
    });
  }

  if (page.slug.length > 50 || page.slug.includes("_")) {
    score -= 5;
    issues.push({
      id: `${page.id}-slug`,
      priority: "low",
      category: "URL structure",
      title: "URL slug could be cleaner",
      description: "Short, hyphenated slugs perform better in search.",
      suggestedFix: page.slug.replace(/_/g, "-").slice(0, 50),
    });
  }

  return { score: Math.max(0, score), issues };
}

function buildHeuristicAudit(input: SeoAuditInput): {
  score: number;
  recommendations: SeoRecommendation[];
  summary: string;
} {
  const focusPages = input.focusPageId
    ? input.pages.filter((p) => p.id === input.focusPageId)
    : input.pages;

  const allIssues: SeoRecommendation[] = [];
  let totalScore = 0;

  for (const page of focusPages) {
    const { score, issues } = scorePage(page);
    totalScore += score;
    allIssues.push(...issues);
  }

  const avgScore = focusPages.length ? Math.round(totalScore / focusPages.length) : 0;
  const highCount = allIssues.filter((i) => i.priority === "high").length;

  const summary = [
    `SEO audit for ${input.studioName}${input.siteUrl ? ` (${input.siteUrl})` : ""}.`,
    `Analysed ${focusPages.length} page${focusPages.length === 1 ? "" : "s"}. Average score: ${avgScore}/100.`,
    highCount > 0
      ? `${highCount} high-priority fix${highCount === 1 ? "" : "es"} — start with missing titles and descriptions.`
      : "No critical issues found. Consider adding Open Graph tags and structured data next.",
  ].join(" ");

  return {
    score: avgScore,
    recommendations: allIssues.slice(0, 12),
    summary,
  };
}

async function callOpenAI(system: string, user: string): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_SEO_MODEL ?? process.env.OPENAI_SUMMARY_MODEL ?? "gpt-4o-mini",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  return json.choices?.[0]?.message?.content?.trim() ?? null;
}

export async function runSeoAudit(input: SeoAuditInput): Promise<{
  score: number;
  recommendations: SeoRecommendation[];
  summary: string;
}> {
  const heuristic = buildHeuristicAudit(input);

  const pageData = (input.focusPageId
    ? input.pages.filter((p) => p.id === input.focusPageId)
    : input.pages
  ).map((p) => ({
    id: p.id,
    title: p.title,
    slug: p.slug,
    status: p.status,
    seoTitle: p.seoTitle,
    seoDescription: p.seoDescription,
    isHome: p.isHome,
  }));

  const raw = await callOpenAI(
    `You are an SEO specialist for dance studio websites. Return JSON: score (0-100 number), summary (2-3 sentence string), recommendations (array of {id, priority: high|medium|low, category, title, description, suggestedFix}). Focus on meta titles, descriptions, local SEO, and content gaps. Be specific and actionable.`,
    `Studio: ${input.studioName}
Site URL: ${input.siteUrl ?? "unknown"}
Pages: ${JSON.stringify(pageData, null, 2)}`,
  );

  if (!raw) return heuristic;

  try {
    const parsed = JSON.parse(raw) as {
      score?: number;
      summary?: string;
      recommendations?: SeoRecommendation[];
    };
    const aiRecs = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];
    const merged = [...heuristic.recommendations];
    for (const rec of aiRecs) {
      if (!merged.some((m) => m.title === rec.title)) merged.push(rec);
    }
    return {
      score: typeof parsed.score === "number" ? parsed.score : heuristic.score,
      recommendations: merged.slice(0, 15),
      summary: parsed.summary?.trim() || heuristic.summary,
    };
  } catch {
    return heuristic;
  }
}

export async function modernizeSeoFields(input: {
  studioName: string;
  pageTitle: string;
  currentTitle: string | null;
  currentDescription: string | null;
}): Promise<{ seoTitle: string; seoDescription: string }> {
  const fallback = {
    seoTitle: input.currentTitle?.trim() || `${input.pageTitle} | ${input.studioName}`,
    seoDescription:
      input.currentDescription?.trim() ||
      `Join ${input.studioName} for ${input.pageTitle.toLowerCase()}. View schedules, pricing, and enrol online today.`,
  };

  const raw = await callOpenAI(
    `You modernize SEO metadata for dance studio web pages. Return JSON with seoTitle (50-60 chars) and seoDescription (120-160 chars). Use natural language, include location-agnostic keywords like "dance classes", and a soft call to action.`,
    `Studio: ${input.studioName}
Page: ${input.pageTitle}
Current title: ${input.currentTitle ?? "(none)"}
Current description: ${input.currentDescription ?? "(none)"}`,
  );

  if (!raw) return fallback;

  try {
    const parsed = JSON.parse(raw) as { seoTitle?: string; seoDescription?: string };
    return {
      seoTitle: parsed.seoTitle?.trim() || fallback.seoTitle,
      seoDescription: parsed.seoDescription?.trim() || fallback.seoDescription,
    };
  } catch {
    return fallback;
  }
}
