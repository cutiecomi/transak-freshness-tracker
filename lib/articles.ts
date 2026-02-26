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

  // News & press releases, partnerships, integrations, product updates, new listings
  if (
    cats.some((c) => c === "announcements" || c === "partnerships" || c === "new listings" || c === "product" || c === "case studies") ||
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
  if (cats.some((c) => c === "podcast")) {
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

const TAG_NORMALIZE: Record<string, string> = {
  "layer2": "Layer 2",
  "layer 2": "Layer 2",
  "tokens and standards": "Tokens & Standards",
  "tokens and standards": "Tokens & Standards",
  "tokens & standards": "Tokens & Standards",
  "tokens and standard": "Tokens & Standards",
  "explainers": "Explainer",
  "explainer": "Explainer",
  "partnerships and integrations": "Partnerships & Integrations",
  "partnerships & integrations": "Partnerships & Integrations",
  "wallets": "Wallets",
  "wallet": "Wallets",
  "how-to guides": "How-To Guides",
  "on-ramp": "On-Ramp",
  "on-Ramp": "On-Ramp",
  "off-ramp": "Off-Ramp",
  "product updates web3": "Product Updates",
  "product updates": "Product Updates",
  "simplifying user onboarding": "User Onboarding",
  "educational": "Educational",
  "gaming": "Gaming",
  "games": "Gaming",
  "nfts": "NFTs",
  "nft checkout": "NFT Checkout",
  "blockchain 101": "Blockchain 101",
  "defi": "DeFi",
  "web3": "Web3",
  "security": "Security",
  "kyc": "KYC",
  "launch": "Launch",
  "expansion": "Expansion",
  "events": "Events",
  "reviews": "Reviews",
  "announcements": "Announcements",
  "ecosystem": "Ecosystem",
  "transak one": "Transak One",
};

function normalizeTags(tags: string[]): string[] {
  const normalized = tags.map((t) => {
    const key = t.toLowerCase().trim();
    return TAG_NORMALIZE[key] || t;
  });
  return [...new Set(normalized)];
}

function categorizeArticle(title: string): string[] {
  const cats: string[] = [];

  // Podcast
  if (/masters of web3|ep\d|podcast|co-?founder.*of\b.*\b(at|labs|dao|protocol)/i.test(title)) cats.push("Podcast");

  // Case Studies
  if (/case study/i.test(title)) cats.push("Case Studies");

  // Stablecoins
  if (/\bstablecoin|usdt|usdc|pyusd|rlusd|usdg|eurc|usde|tether|paypal usd|flatcoin|dark stablecoin|cbdc|genius act|mica\b/i.test(title)) cats.push("Stablecoins");

  // New Listings — new token/chain available on Transak
  if (
    /\bnow (available|listed)|lists \$|lists (HYPE|PEPE|BONK)|is now available\b/i.test(title) ||
    /\bavailable (for purchase|on transak|via transak)\b/i.test(title) ||
    /\btransak lists\b/i.test(title) ||
    /\bnow available for purchases?\b/i.test(title)
  ) cats.push("New Listings");

  // Partnerships — integrations with external companies
  if (
    /\bpartner|integrat|joins forces|teams up\b/i.test(title) ||
    /\b(metamask|phantom|ledger|coinbase|pancakeswap|uniswap|sushi|aave|bitpay|immutable|sequence|ronin|zerion|bloom|zengo|okto|tonkeeper|vechain|lukso|animoca|logx|opera|fireblocks|cobo|galxe|privado)\b/i.test(title) &&
    /\btransak\b/i.test(title)
  ) cats.push("Partnerships");

  // Product — Transak product updates, features, launches
  if (
    /\btransak (one|stream|nft checkout|multi-nft)\b/i.test(title) ||
    /\bproduct update|new feature|wire transfer|apple pay|google pay|google.*sso|apple.*sso\b/i.test(title) ||
    /\breusable kyc|transak\.com got an upgrade\b/i.test(title) ||
    /\bintroducing transak|how to use transak\b/i.test(title)
  ) cats.push("Product");

  // Announcements — company news, regulatory, fundraising, expansions, milestones, compliance, incidents
  if (
    /\bseries.[a-z]|fundraise|strategic round|raises\b/i.test(title) ||
    /\blicense|registration|fintrac|fca |fiu-|soc 2|iso\/iec|certified|regulatory|compliance footprint\b/i.test(title) ||
    /\bexpands|expansion|launches.*in\b/i.test(title) ||
    /\bincident|maintenance|security incident|trust notice\b/i.test(title) ||
    /\bgrowth|milestone|2022 in review|2025\s*$|in review\b/i.test(title) ||
    /\btransak (secures|becomes|expands|receives|celebrates|is proud|is pleased)\b/i.test(title) ||
    /\bcommitment|self-custody|navigating.*regulation|thoughts on\b/i.test(title) ||
    /\bjames young.*joins|advisory board\b/i.test(title) ||
    /\bmeet team transak\b/i.test(title)
  ) cats.push("Announcements");

  // Learn — educational content, explainers, how-tos, guides, listicles
  if (
    /^what (is|are|does|makes)\b/i.test(title) ||
    /^how (to|do|does|can)\b/i.test(title) ||
    /\bexplain|guide|handbook|tutorial|beginner|101\b/i.test(title) ||
    /\bvs\.?\b|\bcomparing\b|\bdifference\b/i.test(title) ||
    /^top \d|^\d+ (best|ways|challenges|reasons|incredible|premier)\b/i.test(title) ||
    /\bdecoding|understanding|breaking down|deep dive|step-by-step\b/i.test(title) ||
    /\bprotect yourself|crypto journey|bitcoin halving explained|ecosystem spotlight\b/i.test(title) ||
    /\bevents (in|to look)|devcon.*guide|token2049\b/i.test(title) ||
    /\bwhy (crypto|fintechs|vcs|wallets|smart|global|stablecoin|neobanks)\b/i.test(title) ||
    /\bplaybook|report\b/i.test(title)
  ) cats.push("Learn");

  // If nothing matched, infer from title patterns
  if (cats.length === 0) {
    if (/\btransak\b/i.test(title) && /\bwith\b|\bon\b|\bfor\b/i.test(title)) {
      cats.push("Partnerships");
    } else if (/\bcrypto|blockchain|web3|defi|token|wallet|nft|payment\b/i.test(title)) {
      cats.push("Learn");
    } else {
      cats.push("Announcements");
    }
  }

  return [...new Set(cats)];
}

function inferTags(title: string, categories: string[]): string[] {
  const t = title.toLowerCase();
  const tags: string[] = [];

  // Product tags
  if (/\btransak one\b/i.test(title)) tags.push("Transak One");
  if (/\btransak stream\b|off.?ramp|sell crypto|cash out|crypto.to.fiat/i.test(title)) tags.push("Off Ramp");
  if (/\bon.?ramp|buy crypto|fiat.to.crypto|purchase/i.test(title)) tags.push("On-Ramp");
  if (/\bnft checkout|nft marketplace/i.test(title)) tags.push("NFT Checkout");

  // Topic tags
  if (/\bnft\b/i.test(title)) tags.push("NFT");
  if (/\bgaming|game|play.to.earn|p2e|gamefi\b/i.test(title)) tags.push("Gaming");
  if (/\bdefi|decentralized finance\b/i.test(title)) tags.push("DeFi");
  if (/\bstablecoin|usdt|usdc|pyusd|rlusd|usdg|eurc\b/i.test(title)) tags.push("Tokens & Standards");
  if (/\bwallet\b/i.test(title)) tags.push("Wallets");
  if (/\bkyc|compliance|regulation|license|fca|genius act|mica|clarity act|travel rule\b/i.test(title)) tags.push("Compliance");
  if (/\bsecurity|scam|attack|poison|incident\b/i.test(title)) tags.push("Security");
  if (/\blayer 2|l2|zkevm|rollup|superchain\b/i.test(title)) tags.push("Layer 2");
  if (/\bethereum|eth\b/i.test(title)) tags.push("Ethereum");
  if (/\bbitcoin|btc\b/i.test(title)) tags.push("Bitcoin");
  if (/\bsolana|sol\b/i.test(title)) tags.push("Solana");
  if (/\bmeme.?coin|pepe|bonk|pnut|trump|melania|moodeng\b/i.test(title)) tags.push("Memecoins");
  if (/\bairdrop\b/i.test(title)) tags.push("Airdrops");
  if (/\brwa|tokeniz|real.world.asset|treasury bill\b/i.test(title)) tags.push("RWA");
  if (/\bpayment|pay |payfi|cross.border|remittance\b/i.test(title)) tags.push("Payments");
  if (/\bstaking|restaking|yield\b/i.test(title)) tags.push("Staking");
  if (/\bneobank|fintech|embedded finance\b/i.test(title)) tags.push("Adoption");
  if (/\bai agent|ai crypto\b/i.test(title)) tags.push("AI");
  if (/\baustralia|india|hong kong|philippines|thailand|hawaii|africa|uk |u\.s\.|us |singapore\b/i.test(title)) tags.push("Expansions");
  if (/\bmetamask|phantom|ledger|zengo|coinbase|trustwallet|veworld|tokenpocket\b/i.test(title)) tags.push("Partners");
  if (/\bhow to\b|step.by.step/i.test(title)) tags.push("How-To Guides");
  if (/\bexplain|what is|what are|101|beginner/i.test(title)) tags.push("Blockchain 101");

  return [...new Set(tags)];
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
    if (!url.includes("/blog/") && !url.includes("/blog-old/")) return;
    const date = parseFlexibleDate(dateStr || "");
    if (!date) return;

    const diffMs = now.getTime() - date.getTime();
    const ageMonths = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44)));
    const rawTags = splitAndClean(row["Tags"] || "");
    const categories = categorizeArticle(title);
    const tags = normalizeTags(rawTags.length > 0 ? rawTags : inferTags(title, categories));
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
