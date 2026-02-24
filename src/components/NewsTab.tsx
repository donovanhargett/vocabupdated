import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Twitter, BookOpen } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface XItem {
  author: string;
  username: string;
  summary: string;
  topic: 'AI' | 'VC' | 'neurotech' | 'geopolitics' | 'markets' | 'other';
}

interface Article {
  title: string;
  source: string;
  description: string;
  url: string;
  published_at: string;
}

interface DailyNews {
  date: string;
  x_brief: XItem[];
  stories: Article[];
  fetched_at: string;
}

const TOPIC_COLORS: Record<string, string> = {
  AI:         'bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400',
  VC:         'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
  neurotech:  'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
  geopolitics:'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
  markets:    'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  other:      'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400',
};

const SkeletonCard = () => (
  <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 animate-pulse">
    <div className="flex items-center gap-3 mb-3">
      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-24" />
      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-16" />
    </div>
    <div className="space-y-2">
      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
      <div className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
    </div>
  </div>
);

export const NewsTab = () => {
  const [news, setNews] = useState<DailyNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { fetchNews(); }, []);

  const fetchNews = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-news`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to fetch news');
      }
      setNews(await response.json());
    } catch (err: any) {
      setError(err.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  const hasX = news?.x_brief?.length;
  const hasNews = news?.stories?.length;

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Morning Brief</h2>
          <p className="text-gray-600 dark:text-gray-400">{today}</p>
        </div>
        <button
          onClick={fetchNews}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="space-y-8">
          {/* X section skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-32" />
            </div>
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
          {/* News section skeleton */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-4 h-4 bg-gray-200 dark:bg-gray-700 rounded" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-40" />
            </div>
            <div className="space-y-3">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
          <Newspaper size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-3">{error}</p>
          <button onClick={fetchNews} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
            Try again
          </button>
        </div>
      ) : (
        <div className="space-y-10">

          {/* ── From X ─────────────────────────────────────────────────────── */}
          {hasX ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Twitter size={16} className="text-gray-900 dark:text-white" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">From X</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">via Grok · last 24 h</span>
              </div>
              <div className="space-y-3">
                {news!.x_brief.map((item, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-gray-900 dark:border-white"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold text-gray-900 dark:text-white text-sm">
                        {item.author}
                      </span>
                      <span className="text-gray-400 dark:text-gray-500 text-xs">
                        @{item.username}
                      </span>
                      <span className={`ml-auto text-xs font-medium px-2 py-0.5 rounded-full ${TOPIC_COLORS[item.topic] ?? TOPIC_COLORS.other}`}>
                        {item.topic}
                      </span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                      {item.summary}
                    </p>
                    <a
                      href={`https://x.com/${item.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 mt-3 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View @{item.username} on X <ExternalLink size={11} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {/* ── News Articles ───────────────────────────────────────────────── */}
          {hasNews ? (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <BookOpen size={16} className="text-gray-900 dark:text-white" />
                <h3 className="text-base font-bold text-gray-900 dark:text-white">In the News</h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  TechCrunch · Wired · Reuters · Bloomberg · MIT TR · others
                </span>
              </div>
              <div className="space-y-3">
                {news!.stories.map((article, i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 border-l-4 border-blue-500"
                  >
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h4 className="font-semibold text-gray-900 dark:text-white text-sm leading-snug">
                        {article.title}
                      </h4>
                      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-0.5 rounded-full">
                        {article.source}
                      </span>
                    </div>
                    {article.description && (
                      <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed mb-3">
                        {article.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatTime(article.published_at)}
                      </span>
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Read <ExternalLink size={11} />
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {!hasX && !hasNews && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
              <Newspaper size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No stories found for today.</p>
            </div>
          )}

          {news?.fetched_at && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
              Last fetched {formatTime(news.fetched_at)} · Refreshes once daily
            </p>
          )}
        </div>
      )}
    </div>
  );
};
