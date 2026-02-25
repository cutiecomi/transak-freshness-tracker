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
  timeSensitive: boolean;
}

function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr || !dateStr.trim()) return null;
  const s = dateStr.trim();

  // "17 Oct 2023" format
  const namedMonth = s.match(/^(\d{1,2})\s+(\w+)\s+(\d{4})$/);
  if (namedMonth) {
    const d = new Date(`${namedMonth[2]} ${namedMonth[1]}, ${namedMonth[3]}`);
    if (!isNaN(d.getTime())) return d;
  }

  // "DD/MM/YYYY" or "D/M/YYYY"
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

function getFreshness(ageMonths: number): Article["freshness"] {
  if (ageMonths < 6) return "fresh";
  if (ageMonths < 12) return "aging";
  if (ageMonths < 18) return "stale";
  return "needs-update";
}

function isTimeSensitive(title: string): boolean {
  return /20(2[0-9]|3[0-9])|countdown|upcoming|top\s+\d+\s+in\s+20/i.test(title);
}

function splitAndClean(val: string): string[] {
  if (!val || !val.trim()) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
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

    const date = parseFlexibleDate(dateStr || "");
    if (!date) return;

    const diffMs = now.getTime() - date.getTime();
    const ageMonths = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));

    articles.push({
      id: idx,
      title,
      url,
      publishDate: date.toISOString().split("T")[0],
      publishTimestamp: date.getTime(),
      categories: splitAndClean(row["Categories"] || ""),
      tags: splitAndClean(row["Tags"] || ""),
      ageMonths: Math.max(0, ageMonths),
      freshness: getFreshness(ageMonths),
      timeSensitive: isTimeSensitive(title),
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
