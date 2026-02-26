import { useState, useEffect } from 'react';
import { RefreshCw, AlertTriangle, Brain, Youtube, Music } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabase';

interface WeeklyContent {
  week: string;
  fallacy_name: string;
  fallacy_explanation: string;
  fallacy_example: string;
  bias_name: string;
  bias_explanation: string;
  bias_example: string;
}

export const PreferencesTab = () => {
  const [weeklyContent, setWeeklyContent] = useState<WeeklyContent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWeeklyContent();
  }, []);

  const loadWeeklyContent = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-weekly-content`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setWeeklyContent(data);
      }
    } catch (err) {
      console.error('Failed to load weekly content:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">My Picks</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Weekly critical thinking content and your curated media.
      </p>

      {/* ── Video of the Day placeholder ───────────────────────────────────── */}
      <div className="mb-8">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-3">Video of the Day</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center min-h-[160px]">
            <Youtube size={32} className="text-red-400 mb-3" />
            <p className="font-medium text-gray-600 dark:text-gray-400">YouTube</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Video of the day — coming soon</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow border-2 border-dashed border-gray-200 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center min-h-[160px]">
            <Music size={32} className="text-green-400 mb-3" />
            <p className="font-medium text-gray-600 dark:text-gray-400">Spotify</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Podcast or playlist — coming soon</p>
          </div>
        </div>
      </div>

      {/* ── Weekly Content ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">This Week</h3>
        {weeklyContent && (
          <span className="text-xs text-gray-400 dark:text-gray-500 font-mono">{weeklyContent.week}</span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[0, 1].map(i => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 animate-pulse">
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
              <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mb-3" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-4" />
              <div className="h-16 bg-gray-100 dark:bg-gray-700/50 rounded" />
            </div>
          ))}
        </div>
      ) : weeklyContent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Fallacy of the Week */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-amber-500">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle size={16} className="text-amber-500" />
              <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Fallacy of the Week</p>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {weeklyContent.fallacy_name}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              {weeklyContent.fallacy_explanation}
            </p>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-4 border border-amber-100 dark:border-amber-800">
              <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wide mb-1">In the Wild</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">{weeklyContent.fallacy_example}</p>
            </div>
          </div>

          {/* Bias of the Week */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border-l-4 border-rose-500">
            <div className="flex items-center gap-2 mb-3">
              <Brain size={16} className="text-rose-500" />
              <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Bias of the Week</p>
            </div>
            <h4 className="text-xl font-bold text-gray-900 dark:text-white mb-3">
              {weeklyContent.bias_name}
            </h4>
            <p className="text-gray-700 dark:text-gray-300 text-sm mb-4">
              {weeklyContent.bias_explanation}
            </p>
            <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-4 border border-rose-100 dark:border-rose-800">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wide mb-1">In Practice</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 italic">{weeklyContent.bias_example}</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <RefreshCw size={24} className="text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">Failed to load weekly content.</p>
          <button
            onClick={loadWeeklyContent}
            className="mt-3 text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Try again
          </button>
        </div>
      )}
    </div>
  );
};
