import { BookOpen, FileText, Youtube, ExternalLink } from 'lucide-react';

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
    url: "https://www.amazon.com/Road-Wigan-Pier-George-Orwell/dp/0156767503"
  },
  {
    type: "book",
    author: "Christopher Hitchens",
    title: "Arguably: Essays",
    description: "Every sentence earns its place — the best vocabulary workout in modern political writing",
    url: "https://www.amazon.com/Arguably-Essays-Christopher-Hitchens/dp/1455502782"
  },
  {
    type: "book",
    author: "Christopher Hitchens",
    title: "god is Not Great",
    description: "Dense, polemical, forces you to grapple with precise philosophical and theological vocabulary",
    url: "https://www.amazon.com/God-Not-Great-Religion-Everything/dp/0446697966"
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
    url: "https://www.amazon.com/Democracy-America-Alexis-Tocqueville/dp/0226805360"
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
    url: "https://www.amazon.com/Black-Swan-Improbable-Robustness-Fragility/dp/081297381X"
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

export const ReadingTab = () => {
  const sections = (["book", "article", "youtube"] as const).map((type) => ({
    type,
    ...TYPE_CONFIG[type],
    items: READING_LIST.filter((item) => item.type === type),
  }));

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Reading List</h2>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        Curated books, articles, and videos for building vocabulary and sharpening how you think.
      </p>

      <div className="space-y-10">
        {sections.map(({ type, label, icon: Icon, accent, badge, iconColor, items }) => (
          <div key={type}>
            <div className="flex items-center gap-2 mb-4">
              <Icon size={20} className={iconColor} />
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">{label}</h3>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge}`}>{items.length}</span>
            </div>
            <div className="space-y-3">
              {items.map((item, i) => (
                <a
                  key={i}
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`block bg-white dark:bg-gray-800 rounded-lg shadow p-4 border-l-4 ${accent} hover:shadow-md transition-shadow group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide shrink-0">
                          {item.author}
                        </span>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {item.title}
                      </p>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                    </div>
                    <ExternalLink size={16} className="text-gray-400 group-hover:text-blue-500 transition-colors shrink-0 mt-1" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
