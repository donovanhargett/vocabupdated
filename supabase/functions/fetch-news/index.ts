import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────────────────────
// MULTI-SOURCE NEWS AGGREGATOR
// Priority: X → Reddit → Hacker News → Web RSS
// ─────────────────────────────────────────────────────────────────────────────

interface Story {
  id: string;
  author: string;
  username: string;
  text: string;
  images?: string[];
  url: string;
  likes: number;
  retweets: number;
  created_at: string;
  source: string;
  engagement: number;
}

interface SourceResult {
  stories: Story[];
  source: string;
  success: boolean;
}

// ── X/Twitter ────────────────────────────────────────────────────────────────
const fetchX = async (query: string, maxResults: number = 10): Promise<SourceResult> => {
  const xBearerToken = Deno.env.get("X_BEARER_TOKEN");
  console.log("X_BEARER_TOKEN present:", !!xBearerToken);
  
  if (!xBearerToken) {
    console.error("X_BEARER_TOKEN is not set!");
    return { stories: [], source: "X/Twitter", success: false };
  }

  try {
    const apiUrl =
      `https://api.twitter.com/2/tweets/search/recent` +
      `?query=${encodeURIComponent(query)}` +
      `&max_results=${maxResults}` +
      `&tweet.fields=created_at,author_id,public_metrics,text,attachments` +
      `&expansions=author_id,attachments.media_keys` +
      `&user.fields=name,username`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${xBearerToken}` },
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.log(`X API error ${res.status}:`, errorText);
      return { stories: [], source: "X/Twitter", success: false };
    }

    const data = await res.json();
    console.log(`X API returned ${data.data?.length || 0} tweets for query: ${query}`);
    const tweets: any[] = data.data ?? [];
    const users: any[] = data.includes?.users ?? [];

    const userMap = new Map(users.map((u: any) => [u.id, u]));

    const stories: Story[] = tweets.map((tweet: any) => {
      const author = userMap.get(tweet.author_id);
      const likes = tweet.public_metrics?.like_count ?? 0;
      const retweets = tweet.public_metrics?.retweet_count ?? 0;
      
      return {
        id: tweet.id,
        author: author?.name ?? "Unknown",
        username: author?.username ?? "",
        text: tweet.text.replace(/\s*https:\/\/t\.co\/\S+$/, "").trim(),
        images: [],
        url: `https://x.com/${author?.username ?? "x"}/status/${tweet.id}`,
        likes,
        retweets,
        created_at: tweet.created_at,
        source: "X",
        engagement: likes + retweets * 2,
      };
    });

    return { stories, source: "X/Twitter", success: true };
  } catch (e) {
    console.error("X fetch error:", e);
    return { stories: [], source: "X/Twitter", success: false };
  }
};

// ── Reddit (mock for now - needs proper auth) ────────────────────────────────
const fetchReddit = async (subreddit: string = "technology"): Promise<SourceResult> => {
  try {
    const res = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=25`,
      { headers: { "User-Agent": "VocabUpdated/1.0" } }
    );

    if (!res.ok) return { stories: [], source: "Reddit", success: false };

    const data = await res.json();
    const posts: any[] = data.data?.children ?? [];

    const stories: Story[] = posts
      .filter((p: any) => !p.data.is_self || p.data.selftext?.length > 50)
      .slice(0, 10)
      .map((p: any) => ({
        id: `reddit-${p.data.id}`,
        author: p.data.author,
        username: p.data.author,
        text: p.data.title + (p.data.selftext ? `\n\n${p.data.selftext.slice(0, 500)}` : ""),
        images: p.data.thumbnail && p.data.thumbnail.startsWith("http") ? [p.data.thumbnail] : [],
        url: `https://reddit.com${p.data.permalink}`,
        likes: p.data.score ?? 0,
        retweets: 0,
        created_at: new Date(p.data.created_utc * 1000).toISOString(),
        source: "Reddit",
        engagement: p.data.score ?? 0,
      }));

    return { stories, source: "Reddit", success: true };
  } catch (e) {
    console.error("Reddit fetch error:", e);
    return { stories: [], source: "Reddit", success: false };
  }
};

// ── Hacker News ──────────────────────────────────────────────────────────────
const fetchHackerNews = async (): Promise<SourceResult> => {
  try {
    const topStoriesRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!topStoriesRes.ok) return { stories: [], source: "Hacker News", success: false };

    const storyIds: number[] = await topStoriesRes.json();
    const stories = await Promise.all(
      storyIds.slice(0, 20).map(async (id) => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return res.json();
        } catch { return null; }
      })
    );

    const validStories = stories
      .filter((s): s is any => s && (s.title || s.text))
      .slice(0, 10)
      .map(s => ({
        id: `hn-${s.id}`,
        author: s.by || "Unknown",
        username: s.by || "",
        text: s.title + (s.text ? `\n\n${s.text.replace(/<[^>]*>/g, "").slice(0, 500)}` : ""),
        images: [],
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        likes: s.score || 0,
        retweets: 0,
        created_at: new Date(s.time * 1000).toISOString(),
        source: "Hacker News",
        engagement: s.score || 0,
      }));

    return { stories: validStories, source: "Hacker News", success: true };
  } catch (e) {
    console.error("HN fetch error:", e);
    return { stories: [], source: "Hacker News", success: false };
  }
};

// ── Substack (RSS-style) ────────────────────────────────────────────────────
const fetchSubstack = async (query: string): Promise<SourceResult> => {
  // Substack doesn't have a public API, so we simulate with search
  // In production, you'd use their API or scrape RSS
  return { stories: [], source: "Substack", success: false };
};

// ── Category Queries ────────────────────────────────────────────────────────
const CATEGORY_QUERIES = {
  openclaw: {
    name: "OpenClaw",
    emoji: "🦞",
    xQuery: "openclaw OR @openclaw -is:retweet lang:en",
    reddit: "openclaw",
    keywords: ["openclaw", "agent", "ai automation"],
  },
  biotech: {
    name: "Biotech",
    emoji: "🧬",
    xQuery: "biotech OR biotechnology OR CRISPR OR drug discovery -is:retweet lang:en",
    reddit: "biotech",
    keywords: ["biotech", "drug", "clinical", "fda"],
  },
  neurotech: {
    name: "Neurotech",
    emoji: "🧠",
    xQuery: "neurotech OR brain interface OR BCI OR neuralink -is:retweet lang:en",
    reddit: "neurotechnology",
    keywords: ["brain", "neural", "bci", "neuro"],
  },
  intelligence: {
    name: "Intelligence",
    emoji: "🧠",
    xQuery: '"g factor" OR "fluid intelligence" OR cognitive enhancement -is:retweet lang:en",
    reddit: "cognitivescience",
    keywords: ["intelligence", "iq", "cognitive", "brain training"],
  },
  general: {
    name: "General Tech",
    emoji: "🔥",
    xQuery: '"AI agent" OR "autonomous AI" OR "agentic" OR "open source AI" -is:retweet lang:en',
    reddit: "technology",
    keywords: ["ai", "tech", "startup", "software"],
  },
};

// ── Fetch All Sources for a Category ─────────────────────────────────────────
const fetchCategory = async (
  category: keyof typeof CATEGORY_QUERIES
): Promise<{ stories: Story[]; sources: string[]; insights: string[] }> => {
  const config = CATEGORY_QUERIES[category];
  const allStories: Story[] = [];
  const sources: string[] = [];

  // 1. X/Twitter (primary - most recent)
  const xResult = await fetchX(config.xQuery, 15);
  console.log(`Category ${category}: X result - ${xResult.stories.length} stories, success: ${xResult.success}`);
  if (xResult.success && xResult.stories.length > 0) {
    allStories.push(...xResult.stories);
    sources.push("X");
  }

  // 2. Reddit (try even if X worked, for variety)
  const redditResult = await fetchReddit(config.reddit);
  console.log(`Category ${category}: Reddit result - ${redditResult.stories.length} stories, success: ${redditResult.success}`);
  if (redditResult.success && redditResult.stories.length > 0) {
    // Filter by keywords
    const relevant = redditResult.stories.filter(s =>
      config.keywords.some(k => s.text.toLowerCase().includes(k))
    );
    allStories.push(...relevant.slice(0, 5));
    if (relevant.length > 0) sources.push("Reddit");
  }

  // 3. Hacker News (fallback)
  if (allStories.length < 3) {
    const hnResult = await fetchHackerNews();
    console.log(`Category ${category}: HN result - ${hnResult.stories.length} stories, success: ${hnResult.success}`);
    if (hnResult.success && hnResult.stories.length > 0) {
      const relevant = hnResult.stories.filter(s =>
        config.keywords.some(k => s.text.toLowerCase().includes(k))
      );
      allStories.push(...relevant.slice(0, 5));
      if (relevant.length > 0) sources.push("Hacker News");
    }
  }

  // Remove duplicates and sort by engagement
  const seen = new Set<string>();
  const unique = allStories.filter(s => {
    const key = s.text.slice(0, 50);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const sorted = unique.sort((a, b) => b.engagement - a.engagement);

  // Extract insights
  const insights = extractInsights(sorted);

  return { stories: sorted.slice(0, 10), sources, insights };
};

// ── Insights Extraction ─────────────────────────────────────────────────────
const TREND_PATTERNS = [
  { pattern: /cost|optimization|reduce|cheaper|token/i, label: "💰 Cost" },
  { pattern: /template|repo|github|fork|case/i, label: "📦 Templates" },
  { pattern: /security|hack|vuln|breach|escape/i, label: "🔒 Security" },
  { pattern: /new|release|launch|update|feature/i, label: "🚀 New" },
  { pattern: /tutorial|guide|how to|learn/i, label: "📚 Learn" },
  { pattern: /enterprise|production|scale/i, label: "🏢 Enterprise" },
  { pattern: /chinese|中文|小龙虾/i, label: "🌏 Chinese" },
];

const extractInsights = (stories: Story[]): string[] => {
  const insights: string[] = [];
  
  for (const story of stories) {
    const text = story.text.toLowerCase();
    
    for (const { pattern, label } of TREND_PATTERNS) {
      if (pattern.test(story.text) && !insights.includes(label)) {
        insights.push(label);
      }
    }
  }
  
  return insights.slice(0, 5);
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getDateString();

    // Check cache
    const { data: cached } = await userClient
      .from("daily_news")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (cached && cached.openclaw?.stories?.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all categories
    const results: Record<string, any> = {};
    
    for (const category of Object.keys(CATEGORY_QUERIES) as Array<keyof typeof CATEGORY_QUERIES>) {
      const { stories, sources, insights } = await fetchCategory(category);
      results[category] = {
        stories,
        sources,
        insights,
        fetched_at: new Date().toISOString(),
      };
    }

    // Cache
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_news")
      .upsert(
        { date: today, ...results, fetched_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();

    return new Response(JSON.stringify(inserted ?? { date: today, ...results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
