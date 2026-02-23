import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface DailyContent {
  word: string;
  word_definition: string;
  word_example: string;
  idiom: string;
  idiom_explanation: string;
  idiom_example: string;
}

const getContentDate = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  // At 11:59pm, advance to the next day's content
  if (now.getHours() === 23 && now.getMinutes() >= 59) {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  }
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
};

interface VocabWord {
  id: string;
  word: string;
  definition: string;
  example_sentence: string;
  created_at: string;
}

export const HomeTab = () => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ definition: string; example: string } | null>(null);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const contentDateRef = useRef(getContentDate());
  const { user } = useAuth();

  const loadDailyContent = async (date: string) => {
    setDailyLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-daily-content`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ date }),
        }
      );
      if (response.ok) {
        const data = await response.json();
        setDailyContent(data);
      }
    } catch (err) {
      console.error('Failed to load daily content:', err);
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
    loadDailyContent(contentDateRef.current);

    const channel = supabase
      .channel('vocab_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vocab_words', filter: `user_id=eq.${user?.id}` },
        () => {
          loadWords();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Check every minute for the 11:59pm daily rollover
  useEffect(() => {
    const interval = setInterval(() => {
      const newDate = getContentDate();
      if (newDate !== contentDateRef.current) {
        contentDateRef.current = newDate;
        loadDailyContent(newDate);
      }
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadWords = async () => {
    const { data } = await supabase
      .from('vocab_words')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setWords(data);
  };

  const generateDefinition = async () => {
    if (!word.trim()) return;

    setGenerating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-definition`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ word: word.trim() }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate definition');
      }

      const data = await response.json();
      setPreview({ definition: data.definition, example: data.example });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to generate definition');
    } finally {
      setGenerating(false);
    }
  };

  const saveWord = async () => {
    if (!preview) return;

    setLoading(true);
    try {
      await supabase.from('vocab_words').insert({
        user_id: user?.id,
        word: word.trim(),
        definition: preview.definition,
        example_sentence: preview.example,
        next_review_date: new Date().toISOString(),
      });

      setWord('');
      setPreview(null);
    } catch (err) {
      alert('Failed to save word');
    } finally {
      setLoading(false);
    }
  };

  const deleteWord = async (id: string) => {
    await supabase.from('vocab_words').delete().eq('id', id);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Add New Word</h2>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
        {!preview ? (
          <div className="flex gap-3">
            <input
              type="text"
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && generateDefinition()}
              placeholder="Enter a word..."
              className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={generateDefinition}
              disabled={generating || !word.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
            >
              {generating ? (
                <>
                  <RefreshCw size={20} className="animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Plus size={20} />
                  Generate
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{word}</h3>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{preview.definition}</p>
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Example:</p>
                <p className="text-gray-900 dark:text-white italic">{preview.example}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={saveWord}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Check size={20} />
                Confirm & Save
              </button>
              <button
                onClick={generateDefinition}
                disabled={generating}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                <RefreshCw size={20} />
                Regenerate
              </button>
              <button
                onClick={() => setPreview(null)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Your Words</h3>
      <div className="space-y-3">
        {words.map((w) => (
          <div
            key={w.id}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 cursor-pointer" onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}>
                <h4 className="text-lg font-bold text-gray-900 dark:text-white">{w.word}</h4>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {expandedId === w.id ? w.definition : w.definition.slice(0, 100) + '...'}
                </p>
                {expandedId === w.id && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-700 p-3 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Example:</p>
                    <p className="text-sm text-gray-900 dark:text-white italic">{w.example_sentence}</p>
                  </div>
                )}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteWord(w.id);
                }}
                className="ml-4 p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-12">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Daily Picks</h3>
        {dailyLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[0, 1].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4" />
                <div className="h-14 bg-gray-100 dark:bg-gray-700/50 rounded" />
              </div>
            ))}
          </div>
        ) : dailyContent ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Word of the Day</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{dailyContent.word}</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{dailyContent.word_definition}</p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{dailyContent.word_example}"</p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">à la Michael Tracey</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-purple-500">
              <p className="text-xs font-semibold text-purple-500 uppercase tracking-wider mb-2">Idiom of the Day</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">"{dailyContent.idiom}"</h4>
              <p className="text-gray-700 dark:text-gray-300 mb-4">{dailyContent.idiom_explanation}</p>
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                <p className="text-sm text-gray-600 dark:text-gray-300 italic">"{dailyContent.idiom_example}"</p>
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-3">à la David Sacks</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
