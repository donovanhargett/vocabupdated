import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Heart, Repeat2, TrendingUp, ArrowUpRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  author: string;
  username: string;
  text: string;
  images?: string[];
  url: string;
  likes: number;
  retweets: number;
  created_at: string;
}

interface CategoryData {
  stories: Story[];
  insights: string[];
  sources: string[];
  sources_used?: string[];
  fetched_at: string;
}

interface DailyNews {
  date: string;
  openclaw?: CategoryData;
  biotech?: CategoryData;
  neurotech?: CategoryData;
  intelligence?: CategoryData;
  general?: CategoryData;
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

const CATEGORIES = [
  { key: 'openclaw', name: 'OpenClaw', emoji: '🦞', color: 'border-orange-500' },
  { key: 'biotech', name: 'Biotech', emoji: '🧬', color: 'border-green-500' },
  { key: 'neurotech', name: 'Neurotech', emoji: '🧠', color: 'border-purple-500' },
  { key: 'intelligence', name: 'Intelligence', emoji: '🧠', color: 'border-blue-500' },
  { key: 'general', name: 'General Tech', emoji: '🔥', color: 'border-red-500' },
];

const formatTime = (dateStr: string) =>
  new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });

const VERDICT_STYLE: Record<string, string> = {
  'strong signal': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  'interesting':   'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  'too early':     'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400',
};

export const NewsTab = () => {
  const [news, setNews]             = useState<DailyNews | null>(null);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError]     = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const [ph, setPh]               = useState<DailyPH | null>(null);
  const [phLoading, setPhLoading]   = useState(true);
  const [phError, setPhError]       = useState<string | null>(null);

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
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const renderStory = (story: Story, index: number) => (
    <div
      key={story.id}
      className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 border-l-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
      style={{ borderLeftColor: CATEGORIES.find(c => news?.[c.key as keyof DailyNews]?.stories.some(s => s.id === story.id)) ? undefined : undefined }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-xs font-bold text-gray-400 tabular-nums shrink-0">
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="font-semibold text-gray-900 dark:text-white text-sm truncate">
            {story.author}
          </span>
          <span className="text-gray-400 dark:text-gray-500 text-xs shrink-0">
            @{story.username}
          </span>
        </div>
        <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0 ml-2">
          {formatTime(story.created_at)}
        </span>
      </div>

      <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-2 whitespace-pre-wrap">
        {story.text}
      </p>

      {story.images && story.images.length > 0 && (
        <div className={`mb-2 grid gap-1 rounded-xl overflow-hidden ${story.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {story.images.map((src, idx) => (
            <img key={idx} src={src} alt="" loading="lazy"
              className="w-full object-cover max-h-72 rounded-xl" />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1">
            <Heart size={11} />{(story.likes ?? 0).toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <Repeat2 size={11} />{(story.retweets ?? 0).toLocaleString()}
          </span>
        </div>
        <a href={story.url} target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline">
          View on X <ExternalLink size={10} />
        </a>
      </div>
    </div>
  );

  const renderCategory = (category: typeof CATEGORIES[0], catData: CategoryData) => (
    <div key={category.key} className="space-y-4">
      {/* Insights */}
      {catData.insights && catData.insights.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 rounded-lg p-4 border border-amber-200 dark:border-amber-800">
          <h4 className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-2">🔑 Key Insights</h4>
          <ul className="space-y-1">
            {catData.insights.slice(0, 3).map((insight, i) => (
              <li key={i} className="text-sm text-gray-700 dark:text-gray-300">{insight}</li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Top Sources */}
      {(catData.sources || catData.sources_used) && (catData.sources || catData.sources_used).length > 0 && (
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span>Sources:</span>
          {(catData.sources || catData.sources_used || []).map((source, i) => (
            <span key={i} className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-full">{source}</span>
          ))}
        </div>
      )}
      
      {/* Stories */}
      {catData.stories.slice(0, 5).map((story, i) => (
        <div key={story.id} className={`border-l-4 ${category.color}`}>
          {renderStory(story, i)}
        </div>
      ))}
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto space-y-10">

      {/* ── Product Hunt Today ─────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Product Hunt Today</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">Top 3 launches · VC signal</p>
          </div>
          <button
            onClick={fetchPH}
            disabled={phLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={phLoading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>

        {phLoading ? (
          <div className="space-y-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 animate-pulse">
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
            <TrendingUp size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-2">{phError}</p>
            <button onClick={fetchPH} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Try again</button>
          </div>
        ) : ph?.products?.length ? (
          <div className="space-y-4">
            {ph.products.map((product, i) => (
              <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-orange-500">

                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  {product.thumbnail ? (
                    <img src={product.thumbnail} alt={product.name} loading="lazy"
                      className="w-12 h-12 rounded-xl object-cover shrink-0 border border-gray-100 dark:border-gray-700" />
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
                      <h3 className="font-bold text-gray-900 dark:text-white">{product.name}</h3>
                      {product.one_liner && (
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">— {product.one_liner}</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{product.tagline}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize ${VERDICT_STYLE[product.verdict] || VERDICT_STYLE['interesting']}`}>
                      {product.verdict}
                    </span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">▲ {product.votes.toLocaleString()}</span>
                  </div>
                </div>

                {/* What it does */}
                {product.what_it_does && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">{product.what_it_does}</p>
                )}

                {/* Data chips */}
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
                  {product.comparable?.map(c => (
                    <span key={c} className="text-xs bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full">
                      ~ {c}
                    </span>
                  ))}
                </div>

                {/* Key risk */}
                {product.key_risk && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">Risk: </span>{product.key_risk}
                  </p>
                )}

                <a href={product.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-orange-600 dark:text-orange-400 hover:underline">
                  View on Product Hunt <ArrowUpRight size={11} />
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
            <TrendingUp size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400">No products found for today.</p>
          </div>
        )}
      </div>

      {/* ── Morning Brief ─────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-1">Morning Brief</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{today} · live from X/Twitter</p>
          </div>
          <button
            onClick={fetchNews}
            disabled={newsLoading}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={15} className={newsLoading ? 'animate-spin' : ''} />
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
          {CATEGORIES.map(cat => (
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

        {newsLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow px-4 py-3 animate-pulse">
                <div className="flex items-center gap-2 mb-2">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
                </div>
                <div className="space-y-1.5">
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-4/5" />
                </div>
              </div>
            ))}
          </div>
        ) : newsError ? (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
            <Newspaper size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-gray-500 dark:text-gray-400 mb-3">{newsError}</p>
            <button onClick={fetchNews} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Try again</button>
          </div>
        ) : (
          <>
            {activeCategory === 'all' ? (
              // Show all categories stacked
              <div className="space-y-8">
                {CATEGORIES.map(cat => {
                  const catData = news?.[cat.key as keyof DailyNews] as CategoryData | undefined;
                  if (!catData?.stories?.length) return null;
                  return (
                    <div key={cat.key}>
                      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <span>{cat.emoji}</span> {cat.name}
                        <span className="text-xs font-normal text-gray-500">({catData.stories.length} posts)</span>
                      </h3>
                      {renderCategory(cat, catData)}
                    </div>
                  );
                })}
              </div>
            ) : (
              // Show single category
              CATEGORIES.filter(c => c.key === activeCategory).map(cat => {
                const catData = news?.[cat.key as keyof DailyNews] as CategoryData | undefined;
                if (!catData?.stories?.length) {
                  return (
                    <div key={cat.key} className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
                      <p className="text-gray-500 dark:text-gray-400">No posts found for {cat.name}.</p>
                    </div>
                  );
                }
                return renderCategory(cat, catData);
              })
            )}
            {news?.fetched_at && (
              <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-4">
                Last updated {formatTime(news.fetched_at)} · Sources: X/Twitter
              </p>
            )}
          </>
        )}
      </div>

    </div>
  );
};
