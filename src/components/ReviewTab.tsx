import { useState, useEffect } from 'react';
import { RefreshCw, Send, SkipForward } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface VocabWord {
  id: string;
  word: string;
  definition: string;
  tldr: string;
  pronunciation: string;
  synonyms: string;
  example_sentence: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
}

const calculateNextReview = (quality: number, word: VocabWord) => {
  let { ease_factor, interval, repetitions } = word;

  if (quality >= 3) {
    if (repetitions === 0) {
      interval = 1;
    } else if (repetitions === 1) {
      interval = 6;
    } else {
      interval = Math.round(interval * ease_factor);
    }
    repetitions += 1;
  } else {
    repetitions = 0;
    interval = 1;
  }

  ease_factor = ease_factor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (ease_factor < 1.3) ease_factor = 1.3;

  const nextReviewDate = new Date();
  nextReviewDate.setDate(nextReviewDate.getDate() + interval);

  return { ease_factor, interval, repetitions, next_review_date: nextReviewDate.toISOString() };
};

const getGradeEmoji = (grade: string) => {
  switch (grade) {
    case 'perfect':
      return '✅';
    case 'good':
      return '👍';
    case 'awkward':
      return '⚠️';
    case 'incorrect':
      return '❌';
    default:
      return '👍';
  }
};

export const ReviewTab = () => {
  const [dueWords, setDueWords] = useState<VocabWord[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [userSentence, setUserSentence] = useState('');
  const [grading, setGrading] = useState(false);
  const [feedback, setFeedback] = useState<{ grade: string; feedback: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    loadDueWords();
  }, []);

  const loadDueWords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('vocab_words')
      .select('*')
      .lte('next_review_date', new Date().toISOString())
      .order('next_review_date', { ascending: true });

    if (data) setDueWords(data);
    setLoading(false);
  };

  const currentWord = dueWords[currentIndex];

  const handleRating = async (quality: number) => {
    if (!currentWord) return;

    const updates = calculateNextReview(quality, currentWord);
    await supabase.from('vocab_words').update(updates).eq('id', currentWord.id);

    nextCard();
  };

  const submitSentence = async () => {
    if (!userSentence.trim() || !currentWord) return;

    setGrading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `${supabaseUrl}/functions/v1/grade-sentence`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            word: currentWord.word,
            definition: currentWord.definition,
            userSentence: userSentence.trim(),
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to grade sentence');
      }

      const data = await response.json();
      setFeedback(data);

      await supabase.from('review_history').insert({
        user_id: user?.id,
        word_id: currentWord.id,
        user_sentence: userSentence.trim(),
        ai_feedback: data.feedback,
        ai_grade: data.grade,
      });
    } catch (err) {
      alert('Failed to grade sentence');
    } finally {
      setGrading(false);
    }
  };

  const skipSentence = () => {
    setUserSentence('');
    setFeedback(null);
  };

  const nextCard = () => {
    setShowAnswer(false);
    setUserSentence('');
    setFeedback(null);
    if (currentIndex < dueWords.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      loadDueWords();
      setCurrentIndex(0);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <RefreshCw className="animate-spin text-blue-600" size={32} />
      </div>
    );
  }

  if (!currentWord) {
    return (
      <div className="max-w-2xl mx-auto text-center py-16">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">All Caught Up!</h2>
        <p className="text-gray-600 dark:text-gray-400">No cards due for review right now.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6 text-center">
        <p className="text-gray-600 dark:text-gray-400">
          Card {currentIndex + 1} of {dueWords.length}
        </p>
      </div>

      <div
        onClick={() => setShowAnswer(true)}
        className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 mb-6 min-h-[300px] flex items-center justify-center cursor-pointer hover:shadow-xl transition-shadow"
      >
        {!showAnswer ? (
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white text-center">
            {currentWord.word}
          </h2>
        ) : (
          <div className="w-full space-y-4">
            <div className="flex items-baseline gap-3">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{currentWord.word}</h2>
              {currentWord.pronunciation && (
                <span className="text-sm text-gray-500 dark:text-gray-400 font-mono">{currentWord.pronunciation}</span>
              )}
            </div>
            <p className="text-lg text-gray-700 dark:text-gray-300 mb-1">{currentWord.definition}</p>
            {currentWord.tldr && (
              <p className="text-sm font-medium text-blue-600 dark:text-blue-400">TLDR: {currentWord.tldr}</p>
            )}
            <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Example:</p>
              <ul className="space-y-3">
                {currentWord.example_sentence.split(/\. /).filter(Boolean).map((s, i, a) => (
                  <li key={i} className="flex gap-2 text-gray-900 dark:text-white italic">
                    <span className="text-gray-400 select-none">•</span>
                    <span>{s + (i < a.length - 1 ? '.' : '')}</span>
                  </li>
                ))}
              </ul>
            </div>
            {currentWord.synonyms && (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium">Synonyms:</span> {currentWord.synonyms}
              </p>
            )}
          </div>
        )}
      </div>

      {showAnswer && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-8">
            <button
              onClick={() => handleRating(1)}
              className="py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
            >
              Again
            </button>
            <button
              onClick={() => handleRating(2)}
              className="py-3 bg-orange-600 hover:bg-orange-700 text-white font-medium rounded-lg transition-colors"
            >
              Hard
            </button>
            <button
              onClick={() => handleRating(3)}
              className="py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors"
            >
              Good
            </button>
            <button
              onClick={() => handleRating(4)}
              className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
            >
              Easy
            </button>
          </div>

          <div className="border-t border-gray-300 dark:border-gray-600 pt-8">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Practice: Write a sentence using this word
            </h3>

            {!feedback ? (
              <div className="space-y-3">
                <textarea
                  value={userSentence}
                  onChange={(e) => setUserSentence(e.target.value)}
                  placeholder="Type your sentence here..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex gap-3">
                  <button
                    onClick={submitSentence}
                    disabled={grading || !userSentence.trim()}
                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    {grading ? (
                      <>
                        <RefreshCw size={20} className="animate-spin" />
                        Grading...
                      </>
                    ) : (
                      <>
                        <Send size={20} />
                        Submit
                      </>
                    )}
                  </button>
                  <button
                    onClick={skipSentence}
                    className="px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2"
                  >
                    <SkipForward size={20} />
                    Skip
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-lg space-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{getGradeEmoji(feedback.grade)}</span>
                  <span className="text-xl font-bold text-gray-900 dark:text-white capitalize">
                    {feedback.grade}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{feedback.feedback}</p>
                <div className="bg-white dark:bg-gray-600 p-3 rounded">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Your sentence:</p>
                  <p className="text-gray-900 dark:text-white italic">{userSentence}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
