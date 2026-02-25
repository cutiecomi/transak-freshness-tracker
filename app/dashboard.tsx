"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { Article } from "@/lib/articles";

const FRESHNESS_CONFIG = {
  fresh: { label: "Fresh", emoji: "🟢", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  aging: { label: "Aging", emoji: "🟡", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  stale: { label: "Stale", emoji: "🟠", bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  "needs-update": { label: "Needs Update", emoji: "🔴", bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
};

const FRESHNESS_OPTIONS = ["fresh", "aging", "stale", "needs-update"] as const;

const CONTENT_TYPE_CONFIG = {
  evergreen: { label: "Evergreen", icon: "🌿", color: "text-emerald-700" },
  "semi-evergreen": { label: "Semi-evergreen", icon: "🌤️", color: "text-amber-700" },
  "time-sensitive": { label: "Time-sensitive", icon: "⏰", color: "text-orange-700" },
  news: { label: "News", icon: "📰", color: "text-[#0364FF]" },
};

type SortKey = "title" | "publishDate" | "ageMonths" | "freshness" | "categories" | "contentType";
type SortDir = "asc" | "desc";

type Override = {
  freshness?: Article["freshness"];
  reasoning?: string;
  notes?: string;
};

type Overrides = Record<number, Override>;

function StatCard({ label, value, sub, color, active, onClick }: { label: string; value: number; sub?: string; color: string; active?: boolean; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      className={`rounded-xl border ${color} bg-white p-5 flex flex-col gap-1 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02] ${active ? "ring-2 ring-[#0364FF] ring-offset-2 ring-offset-[#f0f4ff]" : "shadow-sm"}`}>
      <span className="text-sm text-gray-500 font-medium">{label}</span>
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {sub && <span className="text-xs text-gray-400">{sub}</span>}
    </div>
  );
}

function EditModal({ article, override, onSave, onClose }: {
  article: Article;
  override: Override;
  onSave: (o: Override) => void;
  onClose: () => void;
}) {
  const [freshness, setFreshness] = useState(override.freshness || article.freshness);
  const [reasoning, setReasoning] = useState(override.reasoning ?? article.reasoning);
  const [notes, setNotes] = useState(override.notes ?? "");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-blue-100 w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div className="flex-1 pr-4">
              <h3 className="text-lg font-bold text-gray-900 leading-tight">{article.title}</h3>
              <a href={article.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#0364FF] hover:underline mt-1 block truncate">{article.url}</a>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none p-1">✕</button>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap gap-3 mb-6 text-xs text-gray-500">
            <span className="px-2 py-1 bg-[#f0f4ff] rounded-md">Published: {article.publishDate}</span>
            <span className="px-2 py-1 bg-[#f0f4ff] rounded-md">Age: {article.ageMonths} months</span>
            <span className="px-2 py-1 bg-[#f0f4ff] rounded-md">{CONTENT_TYPE_CONFIG[article.contentType].icon} {CONTENT_TYPE_CONFIG[article.contentType].label}</span>
          </div>

          {/* Status */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
            <div className="flex flex-wrap gap-2">
              {FRESHNESS_OPTIONS.map((f) => {
                const fc = FRESHNESS_CONFIG[f];
                const selected = freshness === f;
                return (
                  <button key={f} onClick={() => setFreshness(f)}
                    className={`inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-all ${selected ? `${fc.bg} ${fc.text} ${fc.border} ring-2 ring-offset-1 ring-current` : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                    {fc.emoji} {fc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Reasoning */}
          <div className="mb-5">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Reasoning</label>
            <textarea value={reasoning} onChange={(e) => setReasoning(e.target.value)}
              rows={2}
              className="w-full bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#0364FF] focus:ring-1 focus:ring-[#0364FF]/20 resize-none"
              placeholder="Why does this article have this status?" />
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Notes <span className="font-normal text-gray-400">(internal)</span></label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-800 focus:outline-none focus:border-[#0364FF] focus:ring-1 focus:ring-[#0364FF]/20 resize-none"
              placeholder="Any notes for the team — what needs changing, who's responsible, etc." />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <button onClick={() => { onSave({}); onClose(); }}
              className="text-sm text-gray-400 hover:text-red-500 transition-colors">
              Reset to auto
            </button>
            <div className="flex gap-3">
              <button onClick={onClose}
                className="px-4 py-2 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                Cancel
              </button>
              <button onClick={() => { onSave({ freshness, reasoning, notes: notes || undefined }); onClose(); }}
                className="px-4 py-2 text-sm rounded-lg bg-[#0364FF] text-white font-medium hover:bg-blue-700 transition-colors">
                Save changes
              </button>
            </div>
          </div>
        </div>
      </div>
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
  const [overrides, setOverrides] = useState<Overrides>({});
  const [editingId, setEditingId] = useState<number | null>(null);

  // Load overrides from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("transak-freshness-overrides");
      if (saved) setOverrides(JSON.parse(saved));
    } catch {}
  }, []);

  // Save overrides to localStorage
  const saveOverride = useCallback((id: number, override: Override) => {
    setOverrides((prev) => {
      const next = { ...prev };
      if (!override.freshness && !override.reasoning && !override.notes) {
        delete next[id];
      } else {
        next[id] = override;
      }
      localStorage.setItem("transak-freshness-overrides", JSON.stringify(next));
      return next;
    });
  }, []);

  // Apply overrides to articles
  const enrichedArticles = useMemo(() => {
    return articles.map((a) => {
      const o = overrides[a.id];
      if (!o) return a;
      return {
        ...a,
        freshness: o.freshness || a.freshness,
        reasoning: o.reasoning ?? a.reasoning,
      };
    });
  }, [articles, overrides]);

  const counts = useMemo(() => {
    const c = { fresh: 0, aging: 0, stale: 0, "needs-update": 0 };
    enrichedArticles.forEach((a) => c[a.freshness]++);
    return c;
  }, [enrichedArticles]);

  const contentCounts = useMemo(() => {
    const c = { evergreen: 0, "semi-evergreen": 0, "time-sensitive": 0, news: 0 };
    enrichedArticles.forEach((a) => c[a.contentType]++);
    return c;
  }, [enrichedArticles]);

  const overrideCount = Object.keys(overrides).length;

  const filtered = useMemo(() => {
    let result = enrichedArticles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q) || a.reasoning.toLowerCase().includes(q) || (overrides[a.id]?.notes || "").toLowerCase().includes(q));
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
  }, [enrichedArticles, overrides, search, filterCategory, filterFreshness, filterTag, filterContentType, sortKey, sortDir]);

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
  const editingArticle = editingId !== null ? articles.find((a) => a.id === editingId) : null;

  return (
    <div className="max-w-[1600px] mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/transak-logo.webp" alt="Transak" className="w-10 h-10 rounded-full" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Article Freshness Tracker</h1>
              <p className="text-gray-500 text-sm">{enrichedArticles.length} articles · Content-aware freshness analysis</p>
            </div>
          </div>
          {overrideCount > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{overrideCount} manual override{overrideCount !== 1 ? "s" : ""}</span>
              <button onClick={() => { if (confirm("Reset all manual overrides?")) { setOverrides({}); localStorage.removeItem("transak-freshness-overrides"); } }}
                className="text-xs px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                Reset all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Row 1: Freshness */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard label="Total Articles" value={enrichedArticles.length} color="border-blue-100"
          active={!filterFreshness && !filterContentType} onClick={() => { setFilterFreshness(""); setFilterContentType(""); }} />
        <StatCard label="🟢 Fresh" value={counts.fresh} color="border-emerald-100"
          active={filterFreshness === "fresh"} onClick={() => { setFilterFreshness(filterFreshness === "fresh" ? "" : "fresh"); setFilterContentType(""); }} />
        <StatCard label="🟡 Aging" value={counts.aging} color="border-amber-100"
          active={filterFreshness === "aging"} onClick={() => { setFilterFreshness(filterFreshness === "aging" ? "" : "aging"); setFilterContentType(""); }} />
        <StatCard label="🟠 Stale" value={counts.stale} color="border-orange-100"
          active={filterFreshness === "stale"} onClick={() => { setFilterFreshness(filterFreshness === "stale" ? "" : "stale"); setFilterContentType(""); }} />
        <StatCard label="🔴 Needs Update" value={counts["needs-update"]} color="border-red-100"
          active={filterFreshness === "needs-update"} onClick={() => { setFilterFreshness(filterFreshness === "needs-update" ? "" : "needs-update"); setFilterContentType(""); }} />
      </div>

      {/* Stats Row 2: Content types */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard label="🌿 Evergreen" value={contentCounts.evergreen} sub="Concepts & explainers" color="border-emerald-100"
          active={filterContentType === "evergreen"} onClick={() => { setFilterContentType(filterContentType === "evergreen" ? "" : "evergreen"); setFilterFreshness(""); }} />
        <StatCard label="🌤️ Semi-evergreen" value={contentCounts["semi-evergreen"]} sub="Guides & tutorials" color="border-amber-100"
          active={filterContentType === "semi-evergreen"} onClick={() => { setFilterContentType(filterContentType === "semi-evergreen" ? "" : "semi-evergreen"); setFilterFreshness(""); }} />
        <StatCard label="⏰ Time-sensitive" value={contentCounts["time-sensitive"]} sub="Year-specific content" color="border-orange-100"
          active={filterContentType === "time-sensitive"} onClick={() => { setFilterContentType(filterContentType === "time-sensitive" ? "" : "time-sensitive"); setFilterFreshness(""); }} />
        <StatCard label="📰 News" value={contentCounts.news} sub="Partnerships & launches" color="border-blue-100"
          active={filterContentType === "news"} onClick={() => { setFilterContentType(filterContentType === "news" ? "" : "news"); setFilterFreshness(""); }} />
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-blue-100 p-4 mb-6 shadow-sm">
        <div className="text-xs text-[#0364FF] mb-2 font-semibold uppercase tracking-wide">How freshness is determined</div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-gray-700">
          <div><span className="text-emerald-700 font-semibold">🌿 Evergreen</span> — "What is X", explainers → stays fresh up to 2 years</div>
          <div><span className="text-amber-700 font-semibold">🌤️ Semi-evergreen</span> — How-to guides, tutorials → 12 month shelf life</div>
          <div><span className="text-orange-700 font-semibold">⏰ Time-sensitive</span> — Year references, events → expires with the year</div>
          <div><span className="text-[#0364FF] font-semibold">📰 News</span> — Partnerships, launches → historical record, no update needed</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-blue-100 p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input type="text" placeholder="Search articles, reasoning, or notes..."
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="bg-[#f0f4ff] border border-blue-100 rounded-lg px-4 py-2 text-sm text-gray-900 placeholder-gray-400 flex-1 min-w-[200px] focus:outline-none focus:border-[#0364FF] focus:ring-1 focus:ring-[#0364FF]/20 transition-colors" />
          <select value={filterContentType} onChange={(e) => setFilterContentType(e.target.value)}
            className="bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#0364FF]">
            <option value="">All Types</option>
            <option value="evergreen">🌿 Evergreen</option>
            <option value="semi-evergreen">🌤️ Semi-evergreen</option>
            <option value="time-sensitive">⏰ Time-sensitive</option>
            <option value="news">📰 News</option>
          </select>
          <select value={filterCategory} onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#0364FF]">
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterFreshness} onChange={(e) => setFilterFreshness(e.target.value)}
            className="bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#0364FF]">
            <option value="">All Status</option>
            <option value="fresh">🟢 Fresh</option>
            <option value="aging">🟡 Aging</option>
            <option value="stale">🟠 Stale</option>
            <option value="needs-update">🔴 Needs Update</option>
          </select>
          <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
            className="bg-[#f0f4ff] border border-blue-100 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-[#0364FF]">
            <option value="">All Tags</option>
            {tags.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {activeFilters > 0 && (
            <button onClick={() => { setSearch(""); setFilterCategory(""); setFilterFreshness(""); setFilterTag(""); setFilterContentType(""); }}
              className="px-4 py-2 rounded-lg text-sm border border-blue-200 text-gray-500 hover:text-[#0364FF] hover:border-[#0364FF] transition-colors">
              Clear all
            </button>
          )}
        </div>
        <div className="mt-3 text-xs text-gray-400">
          Showing {filtered.length} of {enrichedArticles.length} articles
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-blue-50 bg-[#f0f4ff] text-gray-500">
                <th className="w-10"></th>
                {([
                  ["title", "Title"],
                  ["contentType", "Type"],
                  ["categories", "Category"],
                  ["publishDate", "Published"],
                  ["ageMonths", "Age"],
                  ["freshness", "Status"],
                ] as [SortKey, string][]).map(([key, label]) => (
                  <th key={key} onClick={() => toggleSort(key)}
                    className="text-left px-4 py-3 font-semibold cursor-pointer hover:text-[#0364FF] transition-colors select-none whitespace-nowrap text-xs uppercase tracking-wide">
                    {label} <span className="text-blue-200">{sortIcon(key)}</span>
                  </th>
                ))}
                <th className="text-left px-4 py-3 font-semibold text-xs uppercase tracking-wide text-gray-500 whitespace-nowrap">Reasoning / Notes</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((article) => {
                const fc = FRESHNESS_CONFIG[article.freshness];
                const ct = CONTENT_TYPE_CONFIG[article.contentType];
                const hasOverride = !!overrides[article.id];
                const noteText = overrides[article.id]?.notes;
                return (
                  <tr key={article.id} className={`border-b border-blue-50/80 hover:bg-[#f7f9ff] transition-colors ${hasOverride ? "bg-blue-50/30" : ""}`}>
                    <td className="px-2 py-3 text-center">
                      <button onClick={() => setEditingId(article.id)}
                        className="w-7 h-7 rounded-lg border border-blue-100 text-gray-400 hover:text-[#0364FF] hover:border-[#0364FF] hover:bg-blue-50 transition-all text-xs flex items-center justify-center"
                        title="Edit article">
                        ✏️
                      </button>
                    </td>
                    <td className="px-4 py-3 max-w-sm">
                      <a href={article.url} target="_blank" rel="noopener noreferrer"
                        className="text-[#0364FF] hover:text-blue-800 hover:underline transition-colors line-clamp-2 font-medium">
                        {article.title}
                      </a>
                      {article.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {article.tags.slice(0, 3).map((t) => (
                            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 text-blue-500 border border-blue-100">{t}</span>
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
                        <span className="text-xs px-2 py-1 rounded-md bg-blue-50 text-[#0364FF] border border-blue-100 whitespace-nowrap font-medium">
                          {article.categories[0]}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{article.publishDate}</td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{formatAge(article.ageMonths)}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full ${fc.bg} ${fc.text} border ${fc.border} whitespace-nowrap font-medium ${hasOverride ? "ring-1 ring-[#0364FF]/30" : ""}`}>
                        {fc.emoji} {fc.label}
                        {hasOverride && <span className="text-[10px] opacity-60">✎</span>}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[250px]">
                      <span className="text-xs text-gray-600 leading-relaxed">{article.reasoning}</span>
                      {noteText && (
                        <div className="mt-1 text-xs text-[#0364FF] bg-blue-50 border border-blue-100 rounded px-2 py-1 leading-relaxed">
                          📝 {noteText}
                        </div>
                      )}
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

      {/* Edit Modal */}
      {editingArticle && (
        <EditModal
          article={editingArticle}
          override={overrides[editingArticle.id] || {}}
          onSave={(o) => saveOverride(editingArticle.id, o)}
          onClose={() => setEditingId(null)}
        />
      )}
    </div>
  );
}
