import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

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
  const { user } = useAuth();

  useEffect(() => {
    loadWords();

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
    </div>
  );
};
