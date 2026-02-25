"use client";

import { useState, useMemo } from "react";
import { Article } from "@/lib/articles";

const FRESHNESS_CONFIG = {
  fresh: { label: "Fresh", emoji: "🟢", bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30" },
  aging: { label: "Aging", emoji: "🟡", bg: "bg-yellow-500/15", text: "text-yellow-400", border: "border-yellow-500/30" },
  stale: { label: "Stale", emoji: "🟠", bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30" },
  "needs-update": { label: "Needs Update", emoji: "🔴", bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30" },
};

type SortKey = "title" | "publishDate" | "ageMonths" | "freshness" | "categories";
type SortDir = "asc" | "desc";

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color: string }) {
  return (
    <div className={`rounded-xl border ${color} bg-[#111827] p-5 flex flex-col gap-1`}>
      <span className="text-sm text-gray-400">{label}</span>
      <span className="text-3xl font-bold">{value}</span>
      {sub && <span className="text-xs text-gray-500">{sub}</span>}
    </div>
  );
}

export default function Dashboard({
  articles,
  categories,
  tags,
}: {
  articles: Article[];
  categories: string[];
  tags: string[];
}) {
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterFreshness, setFilterFreshness] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const [filterTimeSensitive, setFilterTimeSensitive] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("publishDate");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const counts = useMemo(() => {
    const c = { fresh: 0, aging: 0, stale: 0, "needs-update": 0 };
    articles.forEach((a) => c[a.freshness]++);
    return c;
  }, [articles]);

  const timeSensitiveCount = useMemo(() => articles.filter((a) => a.timeSensitive).length, [articles]);

  const filtered = useMemo(() => {
    let result = articles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (filterCategory) {
      result = result.filter((a) => a.categories.includes(filterCategory));
    }
    if (filterFreshness) {
      result = result.filter((a) => a.freshness === filterFreshness);
    }
    if (filterTag) {
      result = result.filter((a) => a.tags.includes(filterTag));
    }
    if (filterTimeSensitive) {
      result = result.filter((a) => a.timeSensitive);
    }

    result = [...result].sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "title": cmp = a.title.localeCompare(b.title); break;
        case "publishDate": cmp = a.publishTimestamp - b.publishTimestamp; break;
        case "ageMonths": cmp = a.ageMonths - b.ageMonths; break;
        case "freshness": {
          const order = { fresh: 0, aging: 1, stale: 2, "needs-update": 3 };
          cmp = order[a.freshness] - order[b.freshness]; break;
        }
        case "categories": cmp = (a.categories[0] || "").localeCompare(b.categories[0] || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [articles, search, filterCategory, filterFreshness, filterTag, filterTimeSensitive, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return "↕";
    return sortDir === "asc" ? "↑" : "↓";
  };

  function formatAge(months: number): string {
    if (months < 1) return "< 1 mo";
    if (months < 12) return `${months} mo`;
    const y = Math.floor(months / 12);
    const m = months % 12;
    return m > 0 ? `${y}y ${m}mo` : `${y}y`;
  }

  const activeFilters = [search, filterCategory, filterFreshness, filterTag, filterTimeSensitive].filter(Boolean).length;

  return (
    <div className="max-w-[1400px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#0364FF] flex items-center justify-center text-xl font-bold">T</div>
          <h1 className="text-2xl font-bold">Article Freshness Tracker</h1>
        </div>
        <p className="text-gray-400 text-sm">
          Track which Transak articles need updating · {articles.length} articles indexed
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
        <StatCard label="Total" value={articles.length} color="border-[#0364FF]/30" />
        <StatCard label="🟢 Fresh" value={counts.fresh} sub="< 6 months" color="border-emerald-500/30" />
        <StatCard label="🟡 Aging" value={counts.aging} sub="6–12 months" color="border-yellow-500/30" />
        <StatCard label="🟠 Stale" value={counts.stale} sub="12–18 months" color="border-orange-500/30" />
        <StatCard label="🔴 Needs Update" value={counts["needs-update"]} sub="> 18 months" color="border-red-500/30" />
        <StatCard label="⚠️ Time-sensitive" value={timeSensitiveCount} sub="Year refs in title" color="border-purple-500/30" />
      </div>

      {/* Filters */}
      <div className="bg-[#111827] rounded-xl border border-gray-800 p-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search articles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-4 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-[#0364FF] transition-colors"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <select
            value={filterFreshness}
            onChange={(e) => setFilterFreshness(e.target.value)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]"
          >
            <option value="">All Status</option>
            <option value="fresh">🟢 Fresh</option>
            <option value="aging">🟡 Aging</option>
            <option value="stale">🟠 Stale</option>
            <option value="needs-update">🔴 Needs Update</option>
          </select>
          <select
            value={filterTag}
            onChange={(e) => setFilterTag(e.target.value)}
            className="bg-[#0a0e1a] border border-gray-700 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]"
          >
            <option value="">All Tags</option>
            {tags.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
          <button
            onClick={() => setFilterTimeSensitive(!filterTimeSensitive)}
            className={`px-4 py-2 rounded-lg text-sm border transition-colors ${
              filterTimeSensitive
                ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                : "bg-[#0a0e1a] border-gray-700 text-gray-400 hover:border-gray-500"
            }`}
          >
            ⚠️ Time-sensitive only
          </button>
          {activeFilters > 0 && (
            <button
              onClick={() => {
                setSearch(""); setFilterCategory(""); setFilterFreshness(""); setFilterTag(""); setFilterTimeSensitive(false);
              }}
              className="px-4 py-2 rounded-lg text-sm border border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 transition-colors"
            >
              Clear all
            </button>
          )}
        </div>
        <div className="mt-3 text-xs text-gray-500">
          Showing {filtered.length} of {articles.length} articles
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111827] rounded-xl border border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                {([
                  ["title", "Title"],
                  ["categories", "Category"],
                  ["publishDate", "Published"],
                  ["ageMonths", "Age"],
                  ["freshness", "Status"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th
                    key={key}
                    onClick={() => toggleSort(key)}
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-white transition-colors select-none"
                  >
                    {label} <span className="text-gray-600">{sortIcon(key)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => {
                const fc = FRESHNESS_CONFIG[article.freshness];
                return (
                  <tr key={article.id} className="border-b border-gray-800/50 hover:bg-[#0a0e1a]/50 transition-colors">
                    <td className="px-4 py-3 max-w-md">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:text-blue-300 hover:underline transition-colors line-clamp-2"
                      >
                        {article.title}
                      </a>
                      {article.timeSensitive && (
                        <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-purple-500/15 text-purple-400 border border-purple-500/30">
                          ⚠️
                        </span>
                      )}
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-800 text-gray-500">
                              {t}
                            </span>
                          ))}
                          {article.tags.length > 3 && (
                            <span className="text-[10px] text-gray-600">+{article.tags.length - 3}</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {article.categories.length > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-[#0364FF]/10 text-blue-400 border border-[#0364FF]/20">
                          {article.categories[0]}
                        </span>
                      ) : (
                        <span className="text-gray-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{article.publishDate}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{formatAge(article.ageMonths)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${fc.bg} ${fc.text} border ${fc.border}`}>
                        {fc.emoji} {fc.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-500">No articles match your filters</div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-600">
        Built with 💛 by Comet · Data from Transak Blog
      </div>
    </div>
  );
}
