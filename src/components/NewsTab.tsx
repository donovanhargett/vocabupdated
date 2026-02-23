import { useState, useEffect } from 'react';
import { Newspaper, ExternalLink, RefreshCw, Heart, Repeat2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface Story {
  id: string;
  author: string;
  username: string;
  text: string;
  url: string;
  likes: number;
  retweets: number;
  created_at: string;
}

interface DailyNews {
  date: string;
  stories: Story[];
  fetched_at: string;
}

export const NewsTab = () => {
  const [news, setNews] = useState<DailyNews | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchNews();
  }, []);

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
      const data = await response.json();
      setNews(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load news');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="max-w-4xl mx-auto">
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
        <div className="space-y-4">
          {[0, 1, 2].map((i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-36" />
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-20 ml-auto" />
              </div>
              <div className="space-y-2 mb-4">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6" />
              </div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-24" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
          <Newspaper size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400 mb-3">{error}</p>
          <button
            onClick={fetchNews}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try again
          </button>
        </div>
      ) : news?.stories?.length ? (
        <div className="space-y-4">
          {news.stories.map((story, i) => (
            <div
              key={story.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-blue-500"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                    #{i + 1}
                  </span>
                  <span className="font-semibold text-gray-900 dark:text-white text-sm">
                    {story.author}
                  </span>
                  <span className="text-gray-400 dark:text-gray-500 text-xs">
                    @{story.username}
                  </span>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {formatTime(story.created_at)}
                </span>
              </div>

              <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed mb-4 whitespace-pre-wrap">
                {story.text}
              </p>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 text-xs text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1">
                    <Heart size={12} />
                    {story.likes.toLocaleString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Repeat2 size={12} />
                    {story.retweets.toLocaleString()}
                  </span>
                </div>
                <a
                  href={story.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  View on X <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}

          {news.fetched_at && (
            <p className="text-center text-xs text-gray-400 dark:text-gray-600 pt-2">
              Last fetched {formatTime(news.fetched_at)} · Refreshes once daily
            </p>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-16 text-center">
          <Newspaper size={40} className="text-gray-300 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No stories found for today.</p>
        </div>
      )}
    </div>
  );
};
