import { useState, useEffect } from 'react';
import {
  Newspaper,
  ExternalLink,
  RefreshCw,
  TrendingUp,
  ArrowUpRight,
  Lightbulb,
  Link2,
  Heart,
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
  { key: 'openclaw', name: 'OpenClaw', emoji: '🦞', gradient: 'from-orange-500 to-red-500' },
  { key: 'biotech', name: 'Biotech', emoji: '🧬', gradient: 'from-green-500 to-emerald-500' },
  { key: 'neurotech', name: 'Neurotech', emoji: '🧠', gradient: 'from-purple-500 to-violet-500' },
  { key: 'intelligence', name: 'Intelligence', emoji: '💡', gradient: 'from-blue-500 to-cyan-500' },
  { key: 'general', name: 'General Tech', emoji: '🔥', gradient: 'from-red-500 to-orange-500' },
  { key: 'hrv', name: 'HRV', emoji: '❤️‍🔥', gradient: 'from-rose-500 to-pink-500' },
];

const SOURCE_BADGE: Record<string, string> = {
  X: 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900',
  'Hacker News': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-400',
};

const getSourceBadge = (source: string) => {
  if (source.startsWith('Reddit'))
    return 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
  return SOURCE_BADGE[source] ?? 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
};

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });

const VERDICT_STYLE: Record<string, string> = {
  'strong signal':
    'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  interesting:
    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  'too early':
    'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

/* ── Component ─────────────────────────────────────────────────────────────── */

export const NewsTab = () => {
  const [news, setNews] = useState<DailyNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

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

  const renderBrief = (
    category: (typeof CATEGORIES)[0],
    brief: CategoryBrief
  ) => (
    <div key={category.key} className="space-y-4">
      {/* Summary */}
      {brief.summary && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 border border-gray-100 dark:border-gray-700">
          <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
            {brief.summary}
          </p>
        </div>
      )}

      {/* Highlights */}
      {brief.highlights && brief.highlights.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-xl p-5 border border-amber-200/60 dark:border-amber-800/40">
          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
            <Lightbulb size={13} /> Key Highlights
          </h4>
          <ul className="space-y-2">
            {brief.highlights.map((h, i) => (
              <li
                key={i}
                className="text-sm text-gray-700 dark:text-gray-300 flex items-start gap-2"
              >
                <span className="text-amber-500 mt-0.5 shrink-0">▸</span>
                <span>{h}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {brief.sources && brief.sources.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
            <Link2 size={12} /> Sources ({brief.sources.length})
          </h4>
          <div className="grid gap-2">
            {brief.sources.map((src, i) => (
              <a
                key={i}
                href={src.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg px-4 py-2.5 border border-gray-100 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-500 hover:shadow-sm transition-all group"
              >
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${getSourceBadge(src.source)}`}
                >
                  {src.source}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {src.title}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                    {src.author}
                  </p>
                </div>
                <ExternalLink
                  size={12}
                  className="text-gray-300 dark:text-gray-600 group-hover:text-blue-500 transition-colors shrink-0"
                />
              </a>
            ))}
          </div>
        </div>
      )}

      {/* No data fallback */}
      {!brief.summary && (!brief.highlights || brief.highlights.length === 0) && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-10 text-center">
          <p className="text-gray-400 dark:text-gray-500 text-sm">
            No {category.name} news collected yet today.
          </p>
        </div>
      )}
    </div>
  );

  /* ── Main Render ─────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto space-y-10">
      {/* ── Product Hunt Today ──────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Product Hunt Today
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Top 3 launches · VC signal
            </p>
          </div>
          <button
            onClick={fetchPH}
            disabled={phLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={phLoading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {phLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 animate-pulse"
              >
                <div className="flex gap-3 mb-3">
                  <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl shrink-0" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-2" />
                    <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                  </div>
                </div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5 mb-2" />
                <div className="flex gap-2">
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-20" />
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-24" />
                  <div className="h-5 bg-gray-100 dark:bg-gray-700 rounded-full w-16" />
                </div>
              </div>
            ))}
          </div>
        ) : phError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-10 text-center">
            <TrendingUp
              size={40}
              className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
            />
            <p className="text-gray-500 dark:text-gray-400 mb-2">{phError}</p>
            <button
              onClick={fetchPH}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : ph?.products?.length ? (
          <div className="space-y-4">
            {ph.products.map((product, i) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-orange-500"
              >
                <div className="flex items-start gap-3 mb-3">
                  {product.thumbnail ? (
                    <img
                      src={product.thumbnail}
                      alt={product.name}
                      loading="lazy"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center shrink-0">
                      <TrendingUp size={20} className="text-orange-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-orange-500 tabular-nums">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <h3 className="font-bold text-gray-900 dark:text-white">
                        {product.name}
                      </h3>
                      {product.one_liner && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">
                          — {product.one_liner}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                      {product.tagline}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${
                        VERDICT_STYLE[product.verdict] ??
                        VERDICT_STYLE['interesting']
                      }`}
                    >
                      {product.verdict}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      ▲ {product.votes.toLocaleString()}
                    </span>
                  </div>
                </div>

                {product.what_it_does && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {product.what_it_does}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mb-3">
                  {product.ecosystem && (
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-0.5 rounded-full">
                      {product.ecosystem}
                    </span>
                  )}
                  {product.revenue_model && (
                    <span className="text-xs bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">
                      $ {product.revenue_model}
                    </span>
                  )}
                  {product.comparable?.map((c) => (
                    <span
                      key={c}
                      className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full"
                    >
                      ~ {c}
                    </span>
                  ))}
                </div>

                {product.key_risk && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">
                      Risk:{' '}
                    </span>
                    {product.key_risk}
                  </p>
                )}

                <a
                  href={product.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline"
                >
                  View on Product Hunt <ArrowUpRight size={11} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
            <TrendingUp
              size={40}
              className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
            />
            <p className="text-gray-500 dark:text-gray-400">
              No products found for today.
            </p>
          </div>
        )}
      </div>

      {/* ── Daily Brief ────────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
              Daily Brief
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              {today} · synthesized from X, Reddit &amp; Hacker News
            </p>
          </div>
          <button
            onClick={fetchNews}
            disabled={newsLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw
              size={15}
              className={newsLoading ? 'animate-spin' : ''}
            />
            Refresh
          </button>
        </div>

        {/* Category Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setActiveCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeCategory === 'all'
                ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                activeCategory === cat.key
                  ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              {cat.emoji} {cat.name}
            </button>
          ))}
        </div>

        {/* Content */}
        {newsLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-5 animate-pulse"
              >
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
              </div>
            ))}
          </div>
        ) : newsError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
            <Newspaper
              size={40}
              className="text-gray-300 dark:text-gray-600 mx-auto mb-3"
            />
            <p className="text-gray-500 dark:text-gray-400 mb-3">
              {newsError}
            </p>
            <button
              onClick={fetchNews}
              className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : (
          <>
            {activeCategory === 'all' ? (
              <div className="space-y-10">
                {CATEGORIES.map((cat) => {
                  const brief = news?.[
                    cat.key as keyof DailyNews
                  ] as CategoryBrief | undefined;
                  if (
                    !brief ||
                    (!brief.summary &&
                      (!brief.highlights || brief.highlights.length === 0))
                  )
                    return null;
                  return (
                    <div key={cat.key}>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                        <span className="text-xl">{cat.emoji}</span>{' '}
                        {cat.name}
                      </h3>
                      {renderBrief(cat, brief)}
                    </div>
                  );
                })}
              </div>
            ) : (
              CATEGORIES.filter((c) => c.key === activeCategory).map((cat) => {
                const brief = news?.[
                  cat.key as keyof DailyNews
                ] as CategoryBrief | undefined;
                if (!brief) {
                  return (
                    <div
                      key={cat.key}
                      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-16 text-center"
                    >
                      <p className="text-gray-500 dark:text-gray-400">
                        No brief available for {cat.name} today.
                      </p>
                    </div>
                  );
                }
                return (
                  <div key={cat.key}>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                      <span className="text-xl">{cat.emoji}</span> {cat.name}
                    </h3>
                    {renderBrief(cat, brief)}
                  </div>
                );
              })
            )}
            {news?.fetched_at && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-6">
                Last updated {formatTime(news.fetched_at)} · Sources: X ·
                Reddit · Hacker News
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
};
