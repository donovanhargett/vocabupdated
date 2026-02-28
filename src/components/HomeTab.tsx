import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, RefreshCw, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// Tiger Mom quotes of the day
const TIGER_MOM_QUOTES = [
  "Success is 1% inspiration, 99% perspiration. Nothing worthwhile comes easy.",
  "The easiest way to fail is to not try. You miss 100% of the shots you don't take.",
  "Standards are not about being mean—they're about believing in someone's potential.",
  "Comfort is the enemy of growth. Push past your limits.",
  "The pain of discipline is nothing like the pain of disappointment.",
  "You're not supposed to like me. You're supposed to become better.",
  "Average is a failure. Push yourself to be exceptional.",
  "Excuses don't produce results. Work does.",
  "Your only limit is the effort you're willing to put in.",
  "Quit complaining. Start working. That's how winners are made.",
  "I didn't raise you to be comfortable. I raised you to be capable.",
  "The struggle is where growth happens. Embrace it.",
  "There's no such thing as 'good enough.' There's only 'better.'",
  "Every expert was once a beginner. But beginners don't become experts without work.",
  "Your potential is far greater than your comfort zone.",
];

const getTigerMomQuote = () => {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return TIGER_MOM_QUOTES[dayOfYear % TIGER_MOM_QUOTES.length];
};

interface DailyContent {
  word: string;
  word_definition: string;
  word_pronunciation: string;
  word_example: string;
  idiom: string;
  idiom_explanation: string;
  idiom_example: string;
  topic_title: string;
  topic_explanation: string;
  topic_why_it_matters: string;
  topic_first_principles: string;
  topic_questions: string[];
  topic_feynman: string;
}

const getContentDate = () => {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
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
  tldr: string;
  pronunciation: string;
  synonyms: string;
  example_sentence: string;
  created_at: string;
}

export const HomeTab = () => {
  const [word, setWord] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [words, setWords] = useState<VocabWord[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ definition: string; tldr: string; pronunciation: string; synonyms: string[]; example: string } | null>(null);
  const [dailyContent, setDailyContent] = useState<DailyContent | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);
  const [wordsCollapsed, setWordsCollapsed] = useState(false);
  const contentDateRef = useRef(getContentDate());
  const { user } = useAuth();

  const loadDailyContent = async (date: string) => {
    setDailyLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-daily-content', {
        body: { date },
      });
      if (!error && data) setDailyContent(data);
    } catch (err) {
      console.error('Failed to load daily content:', err);
    } finally {
      setDailyLoading(false);
    }
  };

  useEffect(() => {
    loadWords();
    if (user) loadDailyContent(contentDateRef.current);

    const channel = supabase
      .channel('vocab_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'vocab_words', filter: `user_id=eq.${user?.id}` },
        () => { loadWords(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
      const { data, error } = await supabase.functions.invoke('generate-definition', {
        body: { word: word.trim() },
      });
      if (error) throw new Error(error.message || 'Failed to generate definition');
      const example = Array.isArray(data.example) ? data.example.join(' ') : data.example;
      setPreview({
        definition: data.definition,
        tldr: data.tldr || '',
        pronunciation: data.pronunciation || '',
        synonyms: Array.isArray(data.synonyms) ? data.synonyms : [],
        example,
      });
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
        tldr: preview.tldr,
        pronunciation: preview.pronunciation,
        synonyms: preview.synonyms.join(', '),
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

  const exampleBullets = (sentence: string | string[]) =>
    Array.isArray(sentence)
      ? sentence
      : sentence.split(/\. /).filter(Boolean).map((s, i, a) => s + (i < a.length - 1 ? '.' : ''));

  return (
    <div className="max-w-4xl mx-auto">

      {/* ── Tiger Mom Quote of the Day ──────────────────────────────────────── */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-xl p-5 mb-8 border border-orange-200 dark:border-orange-800/30">
        <p className="text-xs font-bold text-orange-600 dark:text-orange-400 uppercase tracking-wider mb-2">🐯 Tiger Mom Wisdom</p>
        <p className="text-lg font-medium text-gray-800 dark:text-gray-100 italic">"{getTigerMomQuote()}"</p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">— Amy Chua</p>
      </div>

      {/* ── Add New Word ──────────────────────────────────────────────────── */}
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
                <><RefreshCw size={20} className="animate-spin" />Generating...</>
              ) : (
                <><Plus size={20} />Generate</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="flex items-baseline gap-3 mb-2">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">{word}</h3>
                {preview.pronunciation && (
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{preview.pronunciation}</span>
                )}
              </div>
              <p className="text-gray-700 dark:text-gray-300 mb-1">{preview.definition}</p>
              {preview.tldr && (
                <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-4">TLDR: {preview.tldr}</p>
              )}
              <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Example:</p>
                <ul className="space-y-3">
                  {exampleBullets(preview.example).map((s, i) => (
                    <li key={i} className="flex gap-2 text-gray-900 dark:text-white italic">
                      <span className="text-gray-400 select-none">•</span>
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
              {preview.synonyms.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                  <span className="font-medium">Synonyms:</span> {preview.synonyms.join(', ')}
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button onClick={saveWord} disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2">
                <Check size={20} />Confirm & Save
              </button>
              <button onClick={generateDefinition} disabled={generating}
                className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2">
                <RefreshCw size={20} />Regenerate
              </button>
              <button onClick={() => setPreview(null)}
                className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Daily Picks ───────────────────────────────────────────────────── */}
      <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Daily Picks</h3>
      {dailyLoading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[0, 1].map(i => (
              <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4" />
              </div>
            ))}
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 animate-pulse">
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4 mb-4" />
            <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-5" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-5" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-4/6 mb-5" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 mb-2" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-1" />
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-5" />
            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/6 mb-2" />
            {[0,1,2,3].map(i => (
              <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2" />
            ))}
          </div>
        </div>
      ) : dailyContent ? (
        <div className="space-y-4 mb-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-blue-500">
              <p className="text-xs font-semibold text-blue-500 uppercase tracking-wider mb-2">Word of the Day</p>
              <div className="flex items-baseline gap-2 mb-2">
                <h4 className="text-2xl font-bold text-gray-900 dark:text-white">{dailyContent.word}</h4>
                {dailyContent.word_pronunciation && (
                  <span className="text-sm text-gray-400 dark:text-gray-500 font-mono">{dailyContent.word_pronunciation}</span>
                )}
              </div>
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

          {dailyContent.topic_title && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-l-4 border-emerald-500">
              <p className="text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-2">Deep Dive of the Day</p>
              <h4 className="text-2xl font-bold text-gray-900 dark:text-white mb-5">{dailyContent.topic_title}</h4>

              {/* What it is */}
              <div className="mb-5">
                <p className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-2">What it is</p>
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{dailyContent.topic_explanation}</p>
              </div>

              {/* Why it matters */}
              {dailyContent.topic_why_it_matters && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-amber-500 uppercase tracking-wide mb-2">Why it matters</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{dailyContent.topic_why_it_matters}</p>
                </div>
              )}

              {/* First principles */}
              {dailyContent.topic_first_principles && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-blue-500 uppercase tracking-wide mb-2">From first principles</p>
                  <p className="text-gray-700 dark:text-gray-300 leading-relaxed">{dailyContent.topic_first_principles}</p>
                </div>
              )}

              {/* Questions to ask */}
              {dailyContent.topic_questions?.length > 0 && (
                <div className="mb-5">
                  <p className="text-xs font-semibold text-purple-500 uppercase tracking-wide mb-2">Questions to explore</p>
                  <ul className="space-y-2">
                    {dailyContent.topic_questions.map((q, i) => (
                      <li key={i} className="flex gap-2 text-gray-700 dark:text-gray-300">
                        <span className="text-purple-400 font-bold shrink-0">{i + 1}.</span>
                        <span>{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Plain English */}
              {dailyContent.topic_feynman && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-4 border border-emerald-100 dark:border-emerald-800">
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide mb-1">In plain English</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 italic">{dailyContent.topic_feynman}</p>
                </div>
              )}
            </div>
          )}
        </div>
      ) : null}

      {/* ── Your Words ────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
          Your Words
          <span className="ml-2 text-sm font-normal text-gray-400">({words.length})</span>
        </h3>
        <button
          onClick={() => setWordsCollapsed(!wordsCollapsed)}
          className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
        >
          {wordsCollapsed ? <><ChevronDown size={16} />Show</> : <><ChevronUp size={16} />Hide</>}
        </button>
      </div>

      {!wordsCollapsed && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[30%]">Word</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Definition</th>
                <th className="w-10"></th>
              </tr>
            </thead>
            <tbody>
              {words.map((w) => (
                <>
                  <tr
                    key={w.id}
                    onClick={() => setExpandedId(expandedId === w.id ? null : w.id)}
                    className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <span className="font-semibold text-gray-900 dark:text-white">{w.word}</span>
                      {w.pronunciation && (
                        <span className="ml-2 text-xs text-gray-400 font-mono">{w.pronunciation}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400 truncate max-w-0">
                      <span className="block truncate">
                        {expandedId === w.id ? w.definition : w.definition.slice(0, 120) + (w.definition.length > 120 ? '…' : '')}
                      </span>
                    </td>
                    <td className="px-2 py-3">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteWord(w.id); }}
                        className="p-1.5 text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors rounded"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                  {expandedId === w.id && (
                    <tr key={`${w.id}-expanded`} className="border-b border-gray-100 dark:border-gray-700/50 bg-gray-50 dark:bg-gray-700/30">
                      <td colSpan={3} className="px-4 py-4">
                        <p className="text-gray-700 dark:text-gray-300 mb-1">{w.definition}</p>
                        {w.tldr && (
                          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-3">TLDR: {w.tldr}</p>
                        )}
                        <ul className="space-y-2 mb-3">
                          {exampleBullets(w.example_sentence).map((s, i) => (
                            <li key={i} className="flex gap-2 text-sm text-gray-900 dark:text-white italic">
                              <span className="text-gray-400 select-none">•</span>
                              <span>{s}</span>
                            </li>
                          ))}
                        </ul>
                        {w.synonyms && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            <span className="font-medium">Synonyms:</span> {w.synonyms}
                          </p>
                        )}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
