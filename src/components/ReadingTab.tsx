import { useState, useEffect } from 'react';
import { BookOpen, FileText, Youtube, ExternalLink, Plus, Trash2, X, Circle, CheckCircle, AlertTriangle, Sparkles } from 'lucide-react';
import { supabase, supabaseUrl } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

// ── Curated pool ───────────────────────────────────────────────────────────────
// Items are ordered by priority within each type — first 5 (books), 4 (articles),
// 4 (videos) are shown initially. As you mark items "read," the next item in the
// pool slides in to replace it. The goal: vocabulary, precision, worldview.
const CURATED_POOL = [
  // ── BOOKS ────────────────────────────────────────────────────────────────────
  {
    type: "book", author: "George Orwell", title: "Essays (Everyman's)",
    description: "The complete political and cultural writings — foundational for anyone who wants to write or think clearly",
    url: "https://oceanofpdf.com/authors/george-orwell/pdf-epub-a-collection-of-essays-download-63819147382/",
  },
  {
    type: "book", author: "George Orwell", title: "The Road to Wigan Pier",
    description: "Class, poverty, and socialism examined with brutal honesty — Orwell at his most unsparing",
    url: "https://oceanofpdf.com/authors/george-orwell/pdf-epub-the-road-to-wigan-pier-download-46365530832/",
  },
  {
    type: "book", author: "Christopher Hitchens", title: "Arguably: Essays",
    description: "Every sentence earns its place — the single best vocabulary workout in modern political writing",
    url: "https://oceanofpdf.com/authors/christopher-hitchens/pdf-epub-arguably-selected-essays-download-55242380030/",
  },
  {
    type: "book", author: "Nassim Taleb", title: "The Black Swan",
    description: "Combative, idiosyncratic prose packed with uncommon vocabulary — changes how you see risk forever",
    url: "https://oceanofpdf.com/pdf-epub-the-black-swan-the-impact-of-the-highly-improbable-download/",
  },
  {
    type: "book", author: "Alexis de Tocqueville", title: "Democracy in America",
    description: "The sharpest outside diagnosis of American society ever written — vocabulary and worldview both",
    url: "https://oceanofpdf.com/authors/alexis-de-tocqueville/pdf-democracy-in-america-download-12079788302/",
  },
  {
    type: "book", author: "Thomas Sowell", title: "A Conflict of Visions",
    description: "Forces precision in how you think and talk about political disagreement — clarifies your own worldview instantly",
    url: "https://www.amazon.com/Conflict-Visions-Ideological-Political-Struggles/dp/0465002056",
  },
  {
    type: "book", author: "Victor Davis Hanson", title: "The Carnage and Culture",
    description: "Military history through the lens of Western civilization — grand vocabulary, provocative and defensible thesis",
    url: "https://www.amazon.com/Carnage-Culture-Landmark-Battles-Western/dp/0385720386",
  },
  {
    type: "book", author: "Edmund Burke", title: "Reflections on the Revolution in France",
    description: "The founding text of conservatism — rich, formal vocabulary, forces slow careful reading",
    url: "https://www.amazon.com/Reflections-Revolution-France-Oxford-Classics/dp/0199539022",
  },
  {
    type: "book", author: "H.L. Mencken", title: "A Mencken Chrestomathy",
    description: "The most caustic prose in American history — vocabulary goldmine, worldview-expanding on every page",
    url: "https://www.amazon.com/Mencken-Chrestomathy-H-L/dp/0394750268",
  },
  {
    type: "book", author: "Henry Hazlitt", title: "Economics in One Lesson",
    description: "The clearest book ever written on economic reasoning — teaches you to see second-order consequences others miss",
    url: "https://mises.org/library/economics-one-lesson",
  },
  {
    type: "book", author: "Peter Thiel & Blake Masters", title: "Zero to One",
    description: "A genuine contrarian worldview on startups and civilization — every chapter forces you to think differently",
    url: "https://www.amazon.com/Zero-One-Notes-Startups-Future/dp/0804139296",
  },
  {
    type: "book", author: "G.K. Chesterton", title: "Orthodoxy",
    description: "One of the most pleasurable prose styles in the English language — each sentence is a small surprise",
    url: "https://www.gutenberg.org/ebooks/130",
  },
  {
    type: "book", author: "Friedrich Hayek", title: "The Road to Serfdom",
    description: "The 20th century's most important warning about collectivism — formal vocabulary, compressed argument",
    url: "https://www.amazon.com/Road-Serfdom-Text-Documents-Definitive/dp/0226320553",
  },
  {
    type: "book", author: "Theodore Dalrymple", title: "Life at the Bottom",
    description: "Medical essays on poverty and culture — Mencken-level caustic prose applied to contemporary social failure",
    url: "https://www.amazon.com/Life-Bottom-Worldview-Makes-Underclass/dp/1566635055",
  },
  {
    type: "book", author: "William F. Buckley Jr.", title: "God and Man at Yale",
    description: "The book that launched American conservatism — Buckley's prose is a clinic in formal intellectual writing",
    url: "https://www.amazon.com/God-Man-Yale-Superstitions-Academic/dp/0895267659",
  },
  {
    type: "book", author: "Roger Scruton", title: "Fools, Frauds and Firebrands",
    description: "A conservative philosopher dismantling the intellectual left — dense vocabulary, surgical argument",
    url: "https://www.amazon.com/Fools-Frauds-Firebrands-Thinkers-Left/dp/1472965213",
  },
  {
    type: "book", author: "Richard Feynman", title: "Surely You're Joking, Mr. Feynman!",
    description: "Feynman's memoir — the best model of clear first-principles thinking applied to everything, not just physics",
    url: "https://www.amazon.com/Surely-Youre-Joking-Mr-Feynman/dp/0393316041",
  },
  {
    type: "book", author: "Samuel Huntington", title: "The Clash of Civilizations",
    description: "The most important geopolitical framework of the last 30 years — forces you to think at civilizational scale",
    url: "https://www.amazon.com/Clash-Civilizations-Remaking-World-Order/dp/0743231384",
  },
  {
    type: "book", author: "Milton Friedman", title: "Free to Choose",
    description: "The companion book to the PBS series — accessible Friedman, makes economic liberty viscerally clear",
    url: "https://www.amazon.com/Free-Choose-Statement-Milton-Friedman/dp/0156334607",
  },

  // ── ARTICLES ──────────────────────────────────────────────────────────────────
  {
    type: "article", author: "George Orwell", title: "Politics and the English Language",
    description: "Why bad language is bad thinking — the theoretical backbone of this entire app",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/",
  },
  {
    type: "article", author: "Paul Graham", title: "How to Do Great Work",
    description: "The best thing Graham has written — a full theory of how to find and pursue work worth doing",
    url: "https://paulgraham.com/greatwork.html",
  },
  {
    type: "article", author: "George Orwell", title: "Why I Write",
    description: "Short and clarifying — forces you to think about what language is actually for",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/why-i-write/",
  },
  {
    type: "article", author: "Paul Graham", title: "How to Write Usefully",
    description: "What separates language that matters from language that fills space",
    url: "https://paulgraham.com/useful.html",
  },
  {
    type: "article", author: "George Orwell", title: "Shooting an Elephant",
    description: "Orwell's most personal essay — guilt, empire, and the moment he understood power",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/shooting-an-elephant/",
  },
  {
    type: "article", author: "Paul Graham", title: "Keep Your Identity Small",
    description: "Why attaching your identity to a label is the surest way to stop thinking clearly",
    url: "https://paulgraham.com/identity.html",
  },
  {
    type: "article", author: "Christopher Hitchens", title: "On the Limits of Self-Improvement",
    description: "Hitchens at his essayistic best — dense with vocabulary you'll want to steal",
    url: "https://www.vanityfair.com/culture/2007/10/hitchens200710",
  },
  {
    type: "article", author: "Paul Graham", title: "What You'll Wish You'd Known",
    description: "A commencement speech he never gave — how to think about the beginning of any serious intellectual project",
    url: "https://paulgraham.com/hs.html",
  },
  {
    type: "article", author: "George Orwell", title: "Such, Such Were the Joys",
    description: "Orwell's long memoir on English boarding school — unflinching, builds the vocabulary of social observation",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/such-such-were-the-joys/",
  },
  {
    type: "article", author: "Victor Davis Hanson", title: "The Dying Citizen",
    description: "Hanson on the erosion of citizenship — Hoover Institution, dense argument, formal vocabulary",
    url: "https://www.hoover.org/research/dying-citizen",
  },
  {
    type: "article", author: "Thomas Sowell", title: "Is Reality Optional?",
    description: "Sowell at his most precise — a short essay that models what it looks like to think without ideology",
    url: "https://www.hoover.org/research/reality-optional",
  },

  // ── VIDEOS ────────────────────────────────────────────────────────────────────
  // Verified via oEmbed / third-party cross-referencing. Channel links are stable by design.
  {
    type: "youtube", author: "Paul Graham", title: "A Conversation with Paul Graham (Y Combinator, 2018)",
    description: "The clearest Graham has ever been on camera — how he thinks about founders, ideas, and work that matters",
    url: "https://www.youtube.com/watch?v=4WO5kJChg3w",
  },
  {
    type: "youtube", author: "Richard Feynman", title: "Fun to Imagine — Complete BBC Series (1983)",
    description: "Feynman explaining physics the way he explains everything: by actually thinking it through out loud",
    url: "https://www.youtube.com/watch?v=nYg6jzotiAc",
  },
  {
    type: "youtube", author: "Milton Friedman", title: "Myths That Conceal Reality (1977)",
    description: "A masterclass in dismantling vague economic thinking with precise language — Friedman at his best",
    url: "https://www.youtube.com/watch?v=OOZxMjo14pw",
  },
  {
    type: "youtube", author: "Christopher Hitchens", title: "God Is Not Great — Talks at Google",
    description: "One of the greatest public speakers of the 20th century operating at full speed — study the sentence construction",
    url: "https://www.youtube.com/watch?v=sD0B-X9LJjs",
  },
  {
    type: "youtube", author: "Paul Graham", title: "Be Good — Startup School 2008",
    description: "An early Graham talk on why ethical directness and making something people want are the same thing",
    url: "https://www.youtube.com/watch?v=q7K0vRUKXKc",
  },
  {
    type: "youtube", author: "Paul Graham & Jason Calacanis", title: "Paul Graham at LAUNCH Festival 2014",
    description: "Wide-ranging conversation on what YC looks for, Sam Altman's succession, and how to evaluate founders",
    url: "https://www.youtube.com/watch?v=YMqgiXLjvRs",
  },
  {
    type: "youtube", author: "Hoover Institution", title: "Hoover Institution — Sowell, Hanson, and more",
    description: "The best archive of serious intellectual conversation in America — browse by topic or speaker",
    url: "https://www.youtube.com/@HooverInstitution",
  },
  {
    type: "youtube", author: "Firing Line", title: "Firing Line with William F. Buckley Jr.",
    description: "The gold standard of formal intellectual vocabulary in conversation — every episode is a masterclass",
    url: "https://www.youtube.com/@FiringLineWithMargaret",
  },
];

// How many curated items to show per category before revealing more from the pool
const VISIBLE_COUNT: Record<string, number> = { book: 5, article: 4, youtube: 4 };

const TYPE_CONFIG = {
  book: {
    label: "Books", icon: BookOpen,
    accent: "border-amber-500",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  article: {
    label: "Articles", icon: FileText,
    accent: "border-green-500",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    iconColor: "text-green-500",
  },
  youtube: {
    label: "Videos", icon: Youtube,
    accent: "border-red-500",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

type ReadStatus = 'reading' | 'read';

interface UserEntry { id: string; type: string; author: string; title: string; description: string; url: string; }
interface AISuggestion { id: string; type: string; author: string; title: string; description: string; url: string; }
const emptyForm = { type: 'book', author: '', title: '', description: '', url: '' };

// Extract YouTube video ID from a watch URL, null for channel links
const extractVideoId = (url: string): string | null => {
  try { return new URL(url).searchParams.get('v'); } catch { return null; }
};

// Verify a YouTube video ID is still live via noembed (no API key required, CORS-safe)
const validateYouTubeId = async (videoId: string): Promise<boolean> => {
  try {
    const res = await fetch(
      `https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    );
    if (!res.ok) return false;
    const data = await res.json();
    return !data.error;
  } catch { return false; }
};

export const ReadingTab = () => {
  const { user } = useAuth();
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState<Map<string, ReadStatus>>(new Map());
  const [invalidUrls, setInvalidUrls] = useState<Set<string>>(new Set());
  const [aiItems, setAiItems] = useState<AISuggestion[]>([]);
  const [generating, setGenerating] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadUserEntries();
    loadProgress();
    loadAIItems();
    validateVideos();
  }, []);

  const loadUserEntries = async () => {
    const { data } = await supabase.from('reading_list').select('*').order('created_at', { ascending: false });
    if (data) setUserEntries(data);
  };

  const loadProgress = async () => {
    const { data } = await supabase.from('reading_progress').select('item_key, status');
    if (data) {
      const map = new Map<string, ReadStatus>();
      data.forEach(row => map.set(row.item_key, row.status as ReadStatus));
      setProgress(map);
    }
  };

  const loadAIItems = async () => {
    const { data } = await supabase
      .from('ai_recommendations')
      .select('id, type, author, title, description, url')
      .order('created_at', { ascending: true });
    if (data) setAiItems(data);
  };

  const generateRecommendation = async (type: string) => {
    if (generating.has(type)) return;
    setGenerating(prev => new Set([...prev, type]));
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const seenUrls = [
        ...CURATED_POOL.filter(item => item.type === type).map(item => item.url),
        ...aiItems.filter(item => item.type === type).map(item => item.url),
      ];
      const response = await fetch(
        `${supabaseUrl}/functions/v1/generate-recommendation`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ type, seen_urls: seenUrls }),
        }
      );
      if (response.ok) {
        const newItem: AISuggestion = await response.json();
        setAiItems(prev => [...prev, newItem]);
        // Validate new YouTube items via noembed
        if (newItem.type === 'youtube') {
          const id = extractVideoId(newItem.url);
          if (id) {
            const valid = await validateYouTubeId(id);
            if (!valid) setInvalidUrls(prev => new Set([...prev, newItem.url]));
          }
        }
      }
    } catch {
      // Silent fail — generation is best-effort
    } finally {
      setGenerating(prev => { const s = new Set(prev); s.delete(type); return s; });
    }
  };

  // Validate all curated YouTube video IDs in the background (non-blocking)
  const validateVideos = async () => {
    const videoItems = CURATED_POOL.filter(item => item.type === 'youtube' && extractVideoId(item.url));
    const results = await Promise.allSettled(
      videoItems.map(async item => {
        const id = extractVideoId(item.url)!;
        const valid = await validateYouTubeId(id);
        return { url: item.url, valid };
      })
    );
    const bad = new Set<string>();
    results.forEach(r => { if (r.status === 'fulfilled' && !r.value.valid) bad.add(r.value.url); });
    if (bad.size > 0) setInvalidUrls(bad);
  };

  const cycleStatus = async (itemKey: string, itemType?: string) => {
    const current = progress.get(itemKey);
    if (!current) {
      await supabase.from('reading_progress').upsert(
        { user_id: user?.id, item_key: itemKey, status: 'reading', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,item_key' }
      );
      setProgress(new Map(progress).set(itemKey, 'reading'));
    } else if (current === 'reading') {
      await supabase.from('reading_progress').upsert(
        { user_id: user?.id, item_key: itemKey, status: 'read', updated_at: new Date().toISOString() },
        { onConflict: 'user_id,item_key' }
      );
      setProgress(new Map(progress).set(itemKey, 'read'));
      // Trigger AI generation for this category so the pool never runs dry
      if (itemType) generateRecommendation(itemType);
    } else {
      await supabase.from('reading_progress').delete().eq('user_id', user?.id).eq('item_key', itemKey);
      const m = new Map(progress); m.delete(itemKey); setProgress(m);
    }
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('reading_list').insert({
      user_id: user?.id, type: form.type, author: form.author.trim(),
      title: form.title.trim(), description: form.description.trim(), url: form.url.trim(),
    }).select().single();
    if (!error && data) { setUserEntries([data, ...userEntries]); setForm(emptyForm); setShowForm(false); }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('reading_list').delete().eq('id', id);
    setUserEntries(userEntries.filter(e => e.id !== id));
  };

  // Returns the slice of items to show for a given type (curated + AI):
  // all 'reading' items + enough 'unread' items to fill up to VISIBLE_COUNT
  // Items marked 'read' are hidden — the next unread slides in automatically
  const getVisibleCurated = (type: string) => {
    const curatedPool = CURATED_POOL.filter(item => item.type === type);
    const aiPool = aiItems.filter(item => item.type === type);
    const allPool = [...curatedPool, ...aiPool];
    const readingItems = allPool.filter(item => progress.get(item.url) === 'reading');
    const unreadItems = allPool.filter(item => !progress.has(item.url));
    const unreadSlots = Math.max(0, (VISIBLE_COUNT[type] ?? 5) - readingItems.length);
    return [...readingItems, ...unreadItems.slice(0, unreadSlots)];
  };

  const poolTotal = (type: string) =>
    CURATED_POOL.filter(item => item.type === type).length +
    aiItems.filter(item => item.type === type).length;
  const readCount = (type: string) => {
    const curatedPool = CURATED_POOL.filter(item => item.type === type);
    const aiPool = aiItems.filter(item => item.type === type);
    return [...curatedPool, ...aiPool].filter(item => progress.get(item.url) === 'read').length;
  };

  const StatusButton = ({ itemKey, itemType }: { itemKey: string; itemType?: string }) => {
    const status = progress.get(itemKey);
    if (status === 'read') return (
      <button onClick={() => cycleStatus(itemKey, itemType)} title="Read — click to mark unread" className="transition-colors">
        <CheckCircle size={16} className="text-green-500" />
      </button>
    );
    if (status === 'reading') return (
      <button onClick={() => cycleStatus(itemKey, itemType)} title="Reading — click to mark read" className="transition-colors">
        <BookOpen size={16} className="text-blue-500" />
      </button>
    );
    return (
      <button onClick={() => cycleStatus(itemKey, itemType)} title="Mark as reading" className="transition-colors">
        <Circle size={16} className="text-gray-300 dark:text-gray-600 hover:text-gray-400 dark:hover:text-gray-500" />
      </button>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reading List</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Curated for vocabulary, precision, and a worldview worth having. Mark items read to unlock the next.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={16} />Add
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Add to Reading List</h3>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="book">Book</option>
                  <option value="article">Article</option>
                  <option value="youtube">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Author</label>
                <input type="text" value={form.author} onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL *</label>
              <input type="url" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input type="text" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Why it's worth reading" className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>
            <button onClick={handleAdd} disabled={saving || !form.title.trim() || !form.url.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm">
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {(['book', 'article', 'youtube'] as const).map((type) => {
          const cfg = TYPE_CONFIG[type];
          const Icon = cfg.icon;
          const visibleCurated = getVisibleCurated(type);
          const userItems = userEntries.filter(item => item.type === type);
          const read = readCount(type);
          const total = poolTotal(type);

          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className={cfg.iconColor} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{cfg.label}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cfg.badge}`}>
                  {visibleCurated.length + userItems.length}
                </span>
                {read > 0 && (
                  <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">
                    {read}/{total} read
                  </span>
                )}
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[42%]">Title</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[25%]">Author</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Link</th>
                      <th className="px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide text-center w-10">Status</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Curated + AI items (visible slice from pool) */}
                    {visibleCurated.map((item, i) => {
                      const isInvalid = invalidUrls.has(item.url);
                      return (
                        <tr key={item.url ?? i} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                          <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                          <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{item.author}</td>
                          <td className="px-4 py-3">
                            {isInvalid ? (
                              <span className="inline-flex items-center gap-1 text-amber-500 text-xs">
                                <AlertTriangle size={12} /> Unavailable
                              </span>
                            ) : (
                              <a href={item.url} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                                Open <ExternalLink size={13} />
                              </a>
                            )}
                          </td>
                          <td className="px-2 py-3 text-center">
                            <StatusButton itemKey={item.url} itemType={type} />
                          </td>
                          <td className="px-2 py-3" />
                        </tr>
                      );
                    })}
                    {/* Generating indicator */}
                    {generating.has(type) && (
                      <tr className="border-b border-gray-50 dark:border-gray-700/50 last:border-0">
                        <td colSpan={5} className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 dark:text-gray-500 animate-pulse">
                            <Sparkles size={11} />
                            Finding next recommendation…
                          </span>
                        </td>
                      </tr>
                    )}
                    {/* User-added items */}
                    {userItems.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs">{item.author}</td>
                        <td className="px-4 py-3">
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline">
                            Open <ExternalLink size={13} />
                          </a>
                        </td>
                        <td className="px-2 py-3 text-center">
                          <StatusButton itemKey={item.id} itemType={type} />
                        </td>
                        <td className="px-2 py-3">
                          <button onClick={() => handleDelete(item.id)}
                            className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors">
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
