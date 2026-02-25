"use client";

import { useState, useMemo } from "react";
import { Article } from "@/lib/articles";

const FRESHNESS_CONFIG = {
  fresh: { label: "Fresh", emoji: "🟢", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  aging: { label: "Aging", emoji: "🟡", bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
  stale: { label: "Stale", emoji: "🟠", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "needs-update": { label: "Needs Update", emoji: "🔴", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const CONTENT_TYPE_CONFIG = {
  evergreen: { label: "Evergreen", icon: "🌿", color: "text-emerald-600" },
  "semi-evergreen": { label: "Semi-evergreen", icon: "🌤️", color: "text-yellow-600" },
  "time-sensitive": { label: "Time-sensitive", icon: "⏰", color: "text-orange-600" },
  news: { label: "News", icon: "📰", color: "text-blue-600" },
};

type SortKey = "title" | "publishDate" | "ageMonths" | "freshness" | "categories" | "contentType";
type SortDir = "asc" | "desc";

function StatCard({ label, value, sub, color, active, onClick }: { label: string; value: number; sub?: string; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`rounded-xl border ${color} bg-white p-5 flex flex-col gap-1 shadow-sm cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${active ? "ring-2 ring-[#0364FF] ring-offset-2" : ""}`}>
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
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
  const [filterContentType, setFilterContentType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("freshness");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const counts = useMemo(() => {
    const c = { fresh: 0, aging: 0, stale: 0, "needs-update": 0 };
    articles.forEach((a) => c[a.freshness]++);
    return c;
  }, [articles]);

  const contentCounts = useMemo(() => {
    const c = { evergreen: 0, "semi-evergreen": 0, "time-sensitive": 0, news: 0 };
    articles.forEach((a) => c[a.contentType]++);
    return c;
  }, [articles]);

  const filtered = useMemo(() => {
    let result = articles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.reasoning.toLowerCase().includes(q));
    }
    if (filterCategory) result = result.filter((a) => a.categories.includes(filterCategory));
    if (filterFreshness) result = result.filter((a) => a.freshness === filterFreshness);
    if (filterTag) result = result.filter((a) => a.tags.includes(filterTag));
    if (filterContentType) result = result.filter((a) => a.contentType === filterContentType);

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
        case "contentType": cmp = a.contentType.localeCompare(b.contentType); break;
        case "categories": cmp = (a.categories[0] || "").localeCompare(b.categories[0] || ""); break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return result;
  }, [articles, search, filterCategory, filterFreshness, filterTag, filterContentType, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
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

  const activeFilters = [search, filterCategory, filterFreshness, filterTag, filterContentType].filter(Boolean).length;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#0364FF] flex items-center justify-center text-xl font-bold text-white">T</div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Article Freshness Tracker</h1>
            <p className="text-gray-500 text-sm">{articles.length} articles · Content-aware freshness analysis</p>
          </div>
        </div>
      </div>

      {/* Stats Row 1: Freshness */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Articles" value={articles.length} color="border-blue-200"
          active={!filterFreshness && !filterContentType} onClick={() => { setFilterFreshness(""); setFilterContentType(""); }} />
        <StatCard label="🟢 Fresh" value={counts.fresh} color="border-emerald-200"
          active={filterFreshness === "fresh"} onClick={() => { setFilterFreshness(filterFreshness === "fresh" ? "" : "fresh"); setFilterContentType(""); }} />
        <StatCard label="🟡 Aging" value={counts.aging} color="border-yellow-200"
          active={filterFreshness === "aging"} onClick={() => { setFilterFreshness(filterFreshness === "aging" ? "" : "aging"); setFilterContentType(""); }} />
        <StatCard label="🟠 Stale" value={counts.stale} color="border-orange-200"
          active={filterFreshness === "stale"} onClick={() => { setFilterFreshness(filterFreshness === "stale" ? "" : "stale"); setFilterContentType(""); }} />
        <StatCard label="🔴 Needs Update" value={counts["needs-update"]} color="border-red-200"
          active={filterFreshness === "needs-update"} onClick={() => { setFilterFreshness(filterFreshness === "needs-update" ? "" : "needs-update"); setFilterContentType(""); }} />
      </div>

      {/* Stats Row 2: Content types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="🌿 Evergreen" value={contentCounts.evergreen} sub="Concepts & explainers" color="border-emerald-200"
          active={filterContentType === "evergreen"} onClick={() => { setFilterContentType(filterContentType === "evergreen" ? "" : "evergreen"); setFilterFreshness(""); }} />
        <StatCard label="🌤️ Semi-evergreen" value={contentCounts["semi-evergreen"]} sub="Guides & tutorials" color="border-yellow-200"
          active={filterContentType === "semi-evergreen"} onClick={() => { setFilterContentType(filterContentType === "semi-evergreen" ? "" : "semi-evergreen"); setFilterFreshness(""); }} />
        <StatCard label="⏰ Time-sensitive" value={contentCounts["time-sensitive"]} sub="Year-specific content" color="border-orange-200"
          active={filterContentType === "time-sensitive"} onClick={() => { setFilterContentType(filterContentType === "time-sensitive" ? "" : "time-sensitive"); setFilterFreshness(""); }} />
        <StatCard label="📰 News" value={contentCounts.news} sub="Partnerships & launches" color="border-blue-200"
          active={filterContentType === "news"} onClick={() => { setFilterContentType(filterContentType === "news" ? "" : "news"); setFilterFreshness(""); }} />
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="text-xs text-gray-400 mb-2 font-medium uppercase tracking-wide">How freshness is determined</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
          <div><span className="text-emerald-700 font-semibold">🌿 Evergreen</span> — "What is X", explainers, definitions → stays fresh up to 2 years</div>
          <div><span className="text-yellow-700 font-semibold">🌤️ Semi-evergreen</span> — How-to guides, tutorials → 12 month shelf life (UIs change)</div>
          <div><span className="text-orange-700 font-semibold">⏰ Time-sensitive</span> — Year references, events, predictions → expires with the year</div>
          <div><span className="text-blue-700 font-semibold">📰 News</span> — Partnerships, launches → 2 year check (verify partner still active)</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Search articles or reasoning..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm flex-1 min-w-[200px] focus:outline-none focus:border-[#0364FF] focus:ring-1 focus:ring-[#0364FF]/20 transition-colors"
          />
          <select value={filterContentType} onChange={(e) => setFilterContentType(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]">
            <option value="">All Types</option>
            <option value="evergreen">🌿 Evergreen</option>
            <option value="semi-evergreen">🌤️ Semi-evergreen</option>
            <option value="time-sensitive">⏰ Time-sensitive</option>
            <option value="news">📰 News</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterFreshness} onChange={(e) => setFilterFreshness(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]">
            <option value="">All Status</option>
            <option value="fresh">🟢 Fresh</option>
            <option value="aging">🟡 Aging</option>
            <option value="stale">🟠 Stale</option>
            <option value="needs-update">🔴 Needs Update</option>
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#0364FF]">
            <option value="">All Tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setFilterCategory(""); setFilterFreshness(""); setFilterTag(""); setFilterContentType(""); }}
              className="px-4 py-2 rounded-lg text-sm border border-gray-200 text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Showing {filtered.length} of {articles.length} articles
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-gray-500">
                {([
                  ["title", "Title"],
                  ["contentType", "Type"],
                  ["categories", "Category"],
                  ["publishDate", "Published"],
                  ["ageMonths", "Age"],
                  ["freshness", "Status"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)}
                    className="text-left px-4 py-3 font-medium cursor-pointer hover:text-gray-900 transition-colors select-none whitespace-nowrap text-xs uppercase tracking-wide">
                    {label} <span className="text-gray-300">{sortIcon(key)}</span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-medium text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap">Reasoning</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => {
                const fc = FRESHNESS_CONFIG[article.freshness];
                const ct = CONTENT_TYPE_CONFIG[article.contentType];
                return (
                  <tr key={article.id} className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-3 max-w-sm">
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-[#0364FF] hover:text-blue-700 hover:underline transition-colors line-clamp-2 font-medium">
                        {article.title}
                      </a>
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">{t}</span>
                          ))}
                          {article.tags.length > 3 && <span className="text-[10px] text-gray-400">+{article.tags.length - 3}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-xs ${ct.color} font-medium`}>{ct.icon} {ct.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      {article.categories.length > 0 ? (
                        <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-100 whitespace-nowrap">
                          {article.categories[0]}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{article.publishDate}</td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{formatAge(article.ageMonths)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${fc.bg} ${fc.text} border ${fc.border} whitespace-nowrap`}>
                        {fc.emoji} {fc.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      <span className="text-xs text-gray-700 leading-relaxed">{article.reasoning}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">No articles match your filters</div>
        )}
      </div>

      <div className="mt-6 text-center text-xs text-gray-400">
        Built with 💛 by Comet · Data from Transak Blog
      </div>
    </div>
  );
}
