import { useState, useEffect } from 'react';
import { BookOpen, FileText, Youtube, ExternalLink, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const READING_LIST = [
  // ── BOOKS ──────────────────────────────────────────────────────────────────
  {
    type: "book",
    author: "Orwell",
    title: "Essays (Everyman's)",
    description: "The complete political and cultural writings, indispensable",
    url: "https://www.amazon.com/Essays-Everymans-Library-George-Orwell/dp/0375415033"
  },
  {
    type: "book",
    author: "Orwell",
    title: "The Road to Wigan Pier",
    description: "Class, poverty, and socialism examined with brutal honesty",
    url: "https://oceanofpdf.com/authors/george-orwell/pdf-epub-the-road-to-wigan-pier-download-46365530832/"
  },
  {
    type: "book",
    author: "Christopher Hitchens",
    title: "Arguably: Essays",
    description: "Every sentence earns its place — the best vocabulary workout in modern political writing",
    url: "https://oceanofpdf.com/authors/christopher-hitchens/pdf-epub-arguably-selected-essays-download-55242380030/"
  },
  {
    type: "book",
    author: "H.L. Mencken",
    title: "A Mencken Chrestomathy",
    description: "The most caustic prose in American history — vocabulary goldmine, worldview-expanding on every page",
    url: "https://www.amazon.com/Mencken-Chrestomathy-H-L/dp/0394750268"
  },
  {
    type: "book",
    author: "Edmund Burke",
    title: "Reflections on the Revolution in France",
    description: "The founding text of conservatism — rich, formal vocabulary, forces slow careful reading",
    url: "https://www.amazon.com/Reflections-Revolution-France-Oxford-Classics/dp/0199539022"
  },
  {
    type: "book",
    author: "Alexis de Tocqueville",
    title: "Democracy in America",
    description: "The sharpest outside diagnosis of American society ever written — vocabulary and worldview both",
    url: "https://oceanofpdf.com/authors/alexis-de-tocqueville/pdf-democracy-in-america-download-12079788302/"
  },
  {
    type: "book",
    author: "Thomas Sowell",
    title: "A Conflict of Visions",
    description: "Forces precision in how you think and talk about political disagreement — clarifies your own worldview",
    url: "https://www.amazon.com/Conflict-Visions-Ideological-Political-Struggles/dp/0465002056"
  },
  {
    type: "book",
    author: "Victor Davis Hanson",
    title: "The Carnage and Culture",
    description: "Military history through the lens of Western civilization — grand vocabulary, provocative thesis",
    url: "https://www.amazon.com/Carnage-Culture-Landmark-Battles-Western/dp/0385720386"
  },
  {
    type: "book",
    author: "Nassim Taleb",
    title: "The Black Swan",
    description: "Combative, idiosyncratic prose packed with uncommon vocabulary — genuinely changes how you see risk and uncertainty",
    url: "https://oceanofpdf.com/pdf-epub-the-black-swan-the-impact-of-the-highly-improbable-download/"
  },

  // ── ARTICLES ───────────────────────────────────────────────────────────────
  {
    type: "article",
    author: "George Orwell",
    title: "Politics and the English Language",
    description: "Why bad language is bad thinking — the theoretical backbone of this entire app",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/politics-and-the-english-language/"
  },
  {
    type: "article",
    author: "George Orwell",
    title: "Why I Write",
    description: "Short and clarifying — forces you to think about what language is actually for",
    url: "https://www.orwellfoundation.com/the-orwell-foundation/orwell/essays-and-other-works/why-i-write/"
  },
  {
    type: "article",
    author: "Paul Graham",
    title: "How to Write Usefully",
    description: "What separates language that matters from language that fills space",
    url: "https://paulgraham.com/useful.html"
  },
  {
    type: "article",
    author: "Christopher Hitchens",
    title: "On the Limits of Self-Improvement",
    description: "Hitchens at his essayistic best — dense with vocabulary you'll want to steal",
    url: "https://www.vanityfair.com/culture/2007/10/hitchens200710"
  },

  // ── YOUTUBE ────────────────────────────────────────────────────────────────
  {
    type: "youtube",
    author: "Christopher Hitchens",
    title: "Hitchens on Writing — Advice for Writers",
    description: "The craft of writing from someone who actually had one — short, essential",
    url: "https://www.youtube.com/watch?v=OTyxpaXOAIE"
  },
  {
    type: "youtube",
    author: "Paul Graham",
    title: "Paul Graham on Writing, Thinking, and the Work That Matters",
    description: "Practical take on clarity — 20 minutes that will change how you approach language",
    url: "https://www.youtube.com/watch?v=dknLBZFQTXI"
  },
  {
    type: "youtube",
    author: "Christopher Hitchens",
    title: "Hitchens Debates and Lectures (Full Playlist)",
    description: "Watch how he deploys vocabulary live under pressure — better than any writing guide",
    url: "https://www.youtube.com/playlist?list=PLd8V7PnAkmxKgOPJTHXMGQXy8sUJLqGqV"
  },
  {
    type: "youtube",
    author: "Lex Fridman",
    title: "Thomas Sowell — Race, Politics, and Economics",
    description: "Sowell is precise in a way almost no public intellectual is — good vocabulary modelling for professional settings",
    url: "https://www.youtube.com/watch?v=hfbwCDhiMZw"
  },
  {
    type: "youtube",
    author: "Firing Line",
    title: "William F. Buckley Archive",
    description: "The gold standard of formal intellectual vocabulary in conversation — every episode is a masterclass",
    url: "https://www.youtube.com/@FiringLineWithMargaret"
  }
];

const TYPE_CONFIG = {
  book: {
    label: "Books",
    icon: BookOpen,
    accent: "border-amber-500",
    badge: "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
    iconColor: "text-amber-500",
  },
  article: {
    label: "Articles",
    icon: FileText,
    accent: "border-green-500",
    badge: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    iconColor: "text-green-500",
  },
  youtube: {
    label: "Videos",
    icon: Youtube,
    accent: "border-red-500",
    badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
    iconColor: "text-red-500",
  },
};

interface UserEntry {
  id: string;
  type: string;
  author: string;
  title: string;
  description: string;
  url: string;
}

const emptyForm = { type: 'book', author: '', title: '', description: '', url: '' };

export const ReadingTab = () => {
  const { user } = useAuth();
  const [userEntries, setUserEntries] = useState<UserEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadUserEntries();
  }, []);

  const loadUserEntries = async () => {
    const { data } = await supabase
      .from('reading_list')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setUserEntries(data);
  };

  const handleAdd = async () => {
    if (!form.title.trim() || !form.url.trim()) return;
    setSaving(true);
    const { data, error } = await supabase.from('reading_list').insert({
      user_id: user?.id,
      type: form.type,
      author: form.author.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
    }).select().single();

    if (!error && data) {
      setUserEntries([data, ...userEntries]);
      setForm(emptyForm);
      setShowForm(false);
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from('reading_list').delete().eq('id', id);
    setUserEntries(userEntries.filter(e => e.id !== id));
  };

  const sections = (['book', 'article', 'youtube'] as const).map((type) => ({
    type,
    ...TYPE_CONFIG[type],
    curatedItems: READING_LIST.filter((item) => item.type === type),
    userItems: userEntries.filter((item) => item.type === type),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reading List</h2>
          <p className="text-gray-600 dark:text-gray-400">
            Curated books, articles, and videos for building vocabulary and sharpening how you think.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors shrink-0"
        >
          <Plus size={16} />
          Add
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 mb-8 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">Add to Reading List</h3>
            <button onClick={() => { setShowForm(false); setForm(emptyForm); }} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="book">Book</option>
                  <option value="article">Article</option>
                  <option value="youtube">Video</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Author</label>
                <input
                  type="text"
                  value={form.author}
                  onChange={(e) => setForm({ ...form, author: e.target.value })}
                  placeholder="Author name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Title *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Title"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">URL *</label>
              <input
                type="url"
                value={form.url}
                onChange={(e) => setForm({ ...form, url: e.target.value })}
                placeholder="https://"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Description</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Why it's worth reading"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <button
              onClick={handleAdd}
              disabled={saving || !form.title.trim() || !form.url.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium rounded-lg transition-colors text-sm"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      )}

      <div className="space-y-10">
        {sections.map(({ type, label, icon: Icon, badge, iconColor, curatedItems, userItems }) => {
          const totalCount = curatedItems.length + userItems.length;
          const allItems = [
            ...curatedItems.map(item => ({ ...item, isUser: false, id: undefined as string | undefined })),
            ...userItems.map(item => ({ ...item, isUser: true })),
          ];
          return (
            <div key={type}>
              <div className="flex items-center gap-2 mb-3">
                <Icon size={20} className={iconColor} />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{label}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{totalCount}</span>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700">
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[45%]">Title</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide w-[30%]">Author</th>
                      <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Link</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {allItems.map((item, i) => (
                      <tr
                        key={item.id ?? i}
                        className="border-b border-gray-50 dark:border-gray-700/50 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{item.title}</td>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{item.author}</td>
                        <td className="px-4 py-3">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                          >
                            Open <ExternalLink size={13} />
                          </a>
                        </td>
                        <td className="px-2 py-3">
                          {item.isUser && (
                            <button
                              onClick={() => handleDelete(item.id!)}
                              className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
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
