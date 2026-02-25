import fs from "fs";
import path from "path";
import Papa from "papaparse";

export interface Article {
  id: number;
  title: string;
  url: string;
  publishDate: string;
  publishTimestamp: number;
  categories: string[];
  tags: string[];
  ageMonths: number;
  freshness: "fresh" | "aging" | "stale" | "needs-update";
  reasoning: string;
  contentType: "evergreen" | "semi-evergreen" | "time-sensitive" | "news";
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();
  const namedMonth = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (namedMonth) {
    const d = new Date(`${namedMonth[2]} ${namedMonth[1]}, ${namedMonth[3]}`);
    if (!isNaN(d.getTime())) return d;
  }
  const slashed = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashed) {
    const day = parseInt(slashed[1]);
    const month = parseInt(slashed[2]) - 1;
    const year = parseInt(slashed[3]);
    return new Date(year, month, day);
  }
  const fallback = new Date(s);
  return isNaN(fallback.getTime()) ? null : fallback;
}

// Detect content type based on title and category
function detectContentType(title: string, categories: string[]): Article["contentType"] {
  const t = title.toLowerCase();
  const cats = categories.map((c) => c.toLowerCase());

  // News & press releases, partnerships, integrations, product updates
  if (
    cats.some((c) => c.includes("news") || c.includes("press")) ||
    /\bpartner|integrat|collaborat|joins forces|teams up|powers|launches|secures|expands|raises|lists \$/i.test(title) ||
    /now (available|live|on|integrated)|is now|now supports/i.test(title)
  ) {
    return "news";
  }

  // Time-sensitive: year references, events, countdowns, predictions, "top X" lists with years, reports
  if (
    /\b20(2[0-9]|3[0-9])\b/.test(title) ||
    /countdown|upcoming events|devcon|token2049|ethdenver/i.test(title) ||
    /price prediction|forecast|q[1-4]\b/i.test(title)
  ) {
    return "time-sensitive";
  }

  // Evergreen: conceptual explainers, definitions, blockchain 101
  if (
    /^what (is|are|does|makes)\b/i.test(title) ||
    /\bexplained\b|\bexplainer\b|\ba (beginner|simple|comprehensive|detailed|step-by-step) guide\b/i.test(title) ||
    /\bhow (does|do|to choose|to set up|to enable)\b/i.test(title) ||
    /\bvs\.?\b|\bvs\b/i.test(title) ||
    /understanding\b|decoding\b|breaking down\b/i.test(title)
  ) {
    // But if it also has year references, it's semi-evergreen
    if (/\b20(2[0-9]|3[0-9])\b/.test(title)) {
      return "semi-evergreen";
    }
    return "evergreen";
  }

  // How-to guides for specific products (may need UI updates over time)
  if (/^how to\b/i.test(title)) {
    return "semi-evergreen";
  }

  // Podcasts are evergreen conversations
  if (cats.some((c) => c.includes("podcast"))) {
    return "evergreen";
  }

  // Case studies
  if (/case study/i.test(title) || cats.some((c) => c.includes("case stud"))) {
    return "semi-evergreen";
  }

  // Default: treat as semi-evergreen
  return "semi-evergreen";
}

function assessFreshness(
  title: string,
  ageMonths: number,
  contentType: Article["contentType"]
): { freshness: Article["freshness"]; reasoning: string } {
  const t = title.toLowerCase();

  switch (contentType) {
    case "evergreen": {
      // Evergreen content stays fresh much longer
      // But check for specific outdated signals
      if (ageMonths < 24) return { freshness: "fresh", reasoning: "Evergreen explainer — concepts don't expire quickly" };
      if (ageMonths < 36) return { freshness: "aging", reasoning: "Evergreen but aging — may benefit from refreshed examples or links" };
      if (ageMonths < 48) return { freshness: "stale", reasoning: "Evergreen topic but quite old — review for accuracy and outdated references" };
      return { freshness: "needs-update", reasoning: "Evergreen topic but very old — likely has outdated info, screenshots, or broken links" };
    }

    case "semi-evergreen": {
      // How-to guides, product walkthroughs — UIs change, steps get outdated
      if (/\b20(2[0-4])\b/.test(title)) {
        return { freshness: "needs-update", reasoning: `Title references an older year — reads as outdated to visitors` };
      }
      if (/\b2025\b/.test(title) && ageMonths > 12) {
        return { freshness: "stale", reasoning: "Title references 2025 — will soon read as outdated" };
      }
      if (ageMonths < 12) return { freshness: "fresh", reasoning: "Recent guide — likely still accurate" };
      if (ageMonths < 18) return { freshness: "aging", reasoning: "Guide may have outdated UI screenshots or steps" };
      if (ageMonths < 24) return { freshness: "stale", reasoning: "Product UIs and processes likely changed since publication" };
      return { freshness: "needs-update", reasoning: "Old guide — high chance of outdated steps, UI changes, or broken links" };
    }

    case "time-sensitive": {
      // Year-specific content, events, predictions
      const yearMatch = title.match(/\b(20[2-3][0-9])\b/);
      if (yearMatch) {
        const year = parseInt(yearMatch[1]);
        const currentYear = new Date().getFullYear();
        if (year < currentYear - 1) {
          return { freshness: "needs-update", reasoning: `References ${year} — clearly outdated, needs a ${currentYear} refresh or archival` };
        }
        if (year < currentYear) {
          return { freshness: "stale", reasoning: `References ${year} — becoming outdated, consider updating for ${currentYear}` };
        }
        if (year === currentYear) {
          return { freshness: "fresh", reasoning: `Current year (${year}) content — still relevant` };
        }
      }
      // Events, countdowns
      if (/countdown|upcoming/i.test(title) && ageMonths > 3) {
        return { freshness: "needs-update", reasoning: "Event/countdown content — the event has passed" };
      }
      if (ageMonths < 6) return { freshness: "fresh", reasoning: "Recent time-sensitive content" };
      if (ageMonths < 12) return { freshness: "aging", reasoning: "Time-sensitive content aging — verify relevance" };
      return { freshness: "needs-update", reasoning: "Time-sensitive content past its shelf life" };
    }

    case "news": {
      // News and press releases are historical records — they don't need updating
      if (ageMonths < 6) return { freshness: "fresh", reasoning: "Recent news" };
      if (ageMonths < 12) return { freshness: "fresh", reasoning: "News — doesn't need updating (historical record)" };
      return { freshness: "fresh", reasoning: "News/press release — historical record, no update needed" };
    }
  }
}

function splitAndClean(val: string): string[] {
  if (!val || !val.trim()) return [];
  return val.split(",").map((s) => s.trim()).filter(Boolean);
}

export function loadArticles(): Article[] {
  const csvPath = path.join(process.cwd(), "public", "articles.csv");
  const csvContent = fs.readFileSync(csvPath, "utf-8");
  const { data } = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const now = new Date();
  const articles: Article[] = [];

  (data as Record<string, string>[]).forEach((row, idx) => {
    const title = row["Post title"]?.trim();
    const url = row["Post URL"]?.trim();
    const dateStr = row["Publish date"]?.trim();
    if (!title || !url) return;
    if (!url.includes("/blog/")) return;
    const date = parseFlexibleDate(dateStr || "");
    if (!date) return;

    const diffMs = now.getTime() - date.getTime();
    const ageMonths = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
    const categories = splitAndClean(row["Categories"] || "");
    const tags = splitAndClean(row["Tags"] || "");
    const contentType = detectContentType(title, categories);
    const { freshness, reasoning } = assessFreshness(title, ageMonths, contentType);

    articles.push({
      id: idx,
      title,
      url,
      publishDate: date.toISOString().split("T")[0],
      publishTimestamp: date.getTime(),
      categories,
      tags,
      ageMonths,
      freshness,
      reasoning,
      contentType,
    });
  });

  return articles.sort((a, b) => b.publishTimestamp - a.publishTimestamp);
}

export function getAllCategories(articles: Article[]): string[] {
  const set = new Set<string>();
  articles.forEach((a) => a.categories.forEach((c) => set.add(c)));
  return Array.from(set).sort();
}

export function getAllTags(articles: Article[]): string[] {
  const set = new Set<string>();
  articles.forEach((a) => a.tags.forEach((t) => set.add(t)));
  return Array.from(set).sort();
}
