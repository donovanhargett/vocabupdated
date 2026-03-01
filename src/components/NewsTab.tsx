import { useState, useEffect } from 'react';
import {
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { supabase } from '../lib/supabase';

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface SourceRef {
  title: string;
  url: string;
  source: string;
  author: string;
}

interface CategoryBrief {
  summary: string;
  highlights: string[];
  sources: SourceRef[];
  fetched_at: string;
}

interface DailyNews {
  date: string;
  openclaw?: CategoryBrief;
  biotech?: CategoryBrief;
  neurotech?: CategoryBrief;
  intelligence?: CategoryBrief;
  general?: CategoryBrief;
  hrv?: CategoryBrief;
  fetched_at: string;
}

interface PHProduct {
  id: string;
  name: string;
  tagline: string;
  url: string;
  thumbnail: string | null;
  votes: number;
  one_liner: string;
  what_it_does: string;
  ecosystem: string;
  comparable: string[];
  revenue_model: string;
  key_risk: string;
  verdict: 'strong signal' | 'interesting' | 'too early';
}

interface DailyPH {
  date: string;
  products: PHProduct[];
}

/* ── Constants ─────────────────────────────────────────────────────────────── */

const CATEGORIES = [
  { key: 'openclaw', name: 'OpenClaw', emoji: '🦞', color: 'bg-orange-500' },
  { key: 'biotech', name: 'Biotech', emoji: '🧬', color: 'bg-green-500' },
  { key: 'neurotech', name: 'Neurotech', emoji: '🧠', color: 'bg-purple-500' },
  { key: 'intelligence', name: 'Intelligence', emoji: '💡', color: 'bg-blue-500' },
  { key: 'general', name: 'General Tech', emoji: '🔥', color: 'bg-red-500' },
  { key: 'hrv', name: 'Heart Rate Variability', emoji: '❤️', color: 'bg-rose-500' },
];

const getSourceBadge = (source: string) => {
  if (source.startsWith('Reddit')) return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
  if (source === 'Hacker News') return 'bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300';
  if (source === 'X') return 'bg-gray-900 text-white dark:bg-gray-100 dark:text-gray-900';
  return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300';
};

const VERDICT_STYLE: Record<string, string> = {
  'strong signal': 'bg-green-500 text-white',
  interesting: 'bg-amber-500 text-white',
  'too early': 'bg-gray-400 text-white',
};

/* ── Component ─────────────────────────────────────────────────────────────── */

export const NewsTab = () => {
  const [news, setNews] = useState<DailyNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('openclaw');

  const [ph, setPh] = useState<DailyPH | null>(null);
  const [phLoading, setPhLoading] = useState(true);
  const [phError, setPhError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
    fetchPH();
  }, []);

  const invokeWithError = async (fn: string, body: object) => {
    const { data, error } = await supabase.functions.invoke(fn, { body });
    if (error) {
      const body = await (error as any).context?.json?.().catch(() => null);
      throw new Error(body?.error || error.message || `Failed to call ${fn}`);
    }
    return data;
  };

  const fetchNews = async () => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      setNews(await invokeWithError('fetch-news', {}));
    } catch (err: any) {
      setNewsError(err.message || 'Failed to load news');
    } finally {
      setNewsLoading(false);
    }
  };

  const fetchPH = async () => {
    setPhLoading(true);
    setPhError(null);
    try {
      setPh(await invokeWithError('fetch-ph-products', {}));
    } catch (err: any) {
      setPhError(err.message || 'Failed to load Product Hunt');
    } finally {
      setPhLoading(false);
    }
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  /* ── Brief Card ──────────────────────────────────────────────────────────── */

  const renderBrief = (category: (typeof CATEGORIES)[0], brief: CategoryBrief) => (
    <div key={category.key} className="space-y-5">
      {/* Summary - cleaner, more prominent */}
      {brief.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <p className="text-gray-700 dark:text-gray-200 text-base leading-relaxed">
            {brief.summary}
          </p>
        </div>
      )}

      {/* Highlights - cleaner list */}
      {brief.highlights && brief.highlights.length > 0 && (
        <div className="bg-gradient-to-r from-violet-50 to-indigo-50 dark:from-violet-900/20 dark:to-indigo-900/20 rounded-2xl p-6 border border-violet-100 dark:border-violet-800/30">
          <h4 className="text-xs font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Sparkles size={14} /> Key Takeaways
          </h4>
          <ul className="space-y-3">
            {brief.highlights.map((h, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-3">
                <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-violet-200 dark:bg-violet-800 text-violet-700 dark:text-violet-300 text-xs font-medium shrink-0">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources - cleaner cards */}
      {brief.sources && brief.sources.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Read More
          </h4>
          <div className="grid gap-2">
            {brief.sources.slice(0, 6).map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 border border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600 hover:shadow-md transition-all group"
              >
                <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${getSourceBadge(src.source)}`}>
                  {src.source.replace('Reddit r/', 'r/')}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                    {src.title}
                  </p>
                </div>
                <ExternalLink size={14} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  /* ── Main Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* ── Header ────────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Daily Brief</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">{today}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchNews}
            disabled={newsLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg font-medium hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={16} className={newsLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* ── Category Tabs ────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap gap-2 pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
              activeCategory === cat.key
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {cat.emoji} {cat.name}
          </button>
        ))}
      </div>

      {/* ── Content ───────────────────────────────────────────────────────────── */}
      {newsLoading ? (
        <div className="space-y-4 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-2xl" />
          ))}
        </div>
      ) : newsError ? (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-6 text-center">
          <p className="text-red-600 dark:text-red-400">{newsError}</p>
          <button onClick={fetchNews} className="mt-3 text-sm text-red-500 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        CATEGORIES.filter(c => c.key === activeCategory).map(cat => {
          const brief = news?.[cat.key as keyof DailyNews] as CategoryBrief | undefined;
          if (!brief) {
            return (
              <div key={cat.key} className="text-center py-12 text-gray-500 dark:text-gray-400">
                No news found for {cat.name} today.
              </div>
            );
          }
          return (
            <div key={cat.key}>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span>{cat.emoji}</span> {cat.name}
              </h3>
              {renderBrief(cat, brief)}
            </div>
          );
        })
      )}

      {/* ── Product Hunt ────────────────────────────────────────────────────── */}
      <div className="pt-8 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <TrendingUp size={20} className="text-orange-500" />
              Product Hunt — Today's Top Picks
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">VC-grade analysis</p>
          </div>
          <button
            onClick={fetchPH}
            disabled={phLoading}
            className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <RefreshCw size={18} className={phLoading ? 'animate-spin' : ''} />
          </button>
        </div>

        {phLoading ? (
          <div className="grid gap-4 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-28 bg-gray-100 dark:bg-gray-800 rounded-xl" />
            ))}
          </div>
        ) : phError ? (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">{phError}</p>
        ) : ph?.products?.length ? (
          <div className="grid gap-4">
            {ph.products.map((product, i) => (
              <a
                key={product.id}
                href={product.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-600 hover:shadow-lg transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600 dark:text-orange-400 font-bold text-lg shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="font-semibold text-gray-900 dark:text-white">
                        {product.name}
                      </h4>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${VERDICT_STYLE[product.verdict]}`}>
                        {product.verdict}
                      </span>
                      {product.votes > 0 && (
                        <span className="text-xs text-gray-400 dark:text-gray-500">▲ {product.votes}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{product.tagline}</p>
                    {product.what_it_does && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                        {product.what_it_does}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {product.ecosystem && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                          {product.ecosystem}
                        </span>
                      )}
                      {product.revenue_model && (
                        <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-1 rounded">
                          {product.revenue_model}
                        </span>
                      )}
                      {product.comparable?.map(c => (
                        <span key={c} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-1 rounded">
                          vs {c}
                        </span>
                      ))}
                    </div>
                    {product.key_risk && (
                      <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded px-2 py-1.5">
                        ⚠ {product.key_risk}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight size={18} className="text-gray-400 group-hover:text-orange-500 transition-colors shrink-0" />
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="text-center text-gray-500 dark:text-gray-400 py-4">No products found today.</p>
        )}
      </div>
    </div>
  );
};
