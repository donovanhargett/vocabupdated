import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// ── Hacker News API ─────────────────────────────────────────────────────────
const fetchHackerNews = async (tag: string = ""): Promise<Story[]> => {
  try {
    // Get top stories
    const topStoriesRes = await fetch("https://hacker-news.firebaseio.com/v0/topstories.json");
    if (!topStoriesRes.ok) return [];
    
    const storyIds: number[] = await topStoriesRes.json();
    const topIds = storyIds.slice(0, 30);
    
    const stories = await Promise.all(
      topIds.slice(0, 10).map(async (id) => {
        try {
          const res = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          return res.json();
        } catch { return null; }
      })
    );
    
    return stories
      .filter((s): s is any => s && (s.title || s.text))
      .map(s => ({
        id: `hn-${s.id}`,
        author: s.by || "Unknown",
        username: s.by || "",
        text: s.title + (s.text ? `\n\n${s.text.replace(/<[^>]*>/g, '')}` : ""),
        images: [],
        url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
        likes: s.score || 0,
        retweets: 0,
        created_at: new Date(s.time * 1000).toISOString(),
        source: "Hacker News",
      }));
  } catch (e) {
    console.error("HN fetch error:", e);
    return [];
  }
};

// ── Category Search Queries ────────────────────────────────────────────────
const CATEGORIES = {
  openclaw: {
    name: "OpenClaw",
    emoji: "🦞",
    query: "openclaw OR @openclaw -is:retweet lang:en",
    maxResults: 15,
  },
  biotech: {
    name: "Biotech",
    emoji: "🧬",
    query: "biotech OR biotechnology OR CRISPR OR drug discovery OR clinical trial -is:retweet lang:en",
    maxResults: 10,
  },
  neurotech: {
    name: "Neurotech",
    emoji: "🧠",
    query: "neurotech OR brain interface OR BCI OR neuralink OR neuroscience -is:retweet    maxResults: lang:en",
 10,
  },
  intelligence: {
    name: "Intelligence",
    emoji: "🧠",
    query: '"g factor" OR "fluid intelligence" OR "cognitive enhancement" OR IQ research -is:retweet lang:en',
    maxResults: 10,
  },
  general: {
    name: "General Tech",
    emoji: "🔥",
    query: '"AI agent" OR "autonomous AI" OR "agentic" OR "open source AI" OR "new LLM" OR "AI breakthrough" -is:retweet lang:en',
    maxResults: 10,
  },
};

// Trend/Insight patterns to detect
const TREND_PATTERNS = [
  { pattern: /cost|optimization|reduce|cheaper|token/i, label: "💰 Cost Optimization" },
  { pattern: /template|repo|github| fork/i, label: "📦 Templates/Repos" },
  { pattern: /security|hack|vulnerability|escape| breach/i, label: "🔒 Security" },
  { pattern: /new feature|update|release|launch/i, label: "🚀 New Features" },
  { pattern: /tutorial|guide|how to|learn/i, label: "📚 Tutorials" },
  { pattern: /enterprise|production|secure|scale/i, label: "🏢 Enterprise" },
  { pattern: /macos|mac|windows|linux|desktop/i, label: "🖥️ Cross-Platform" },
  { pattern: /chinese|中文|小龙虾/i, label: "🌏 Chinese Community" },
];

// Extract key insights from tweets
const extractInsights = (stories: Story[]): string[] => {
  const insights: string[] = [];
  
  for (const story of stories) {
    const text = story.text.toLowerCase();
    
    for (const { pattern, label } of TREND_PATTERNS) {
      if (pattern.test(story.text) && !insights.includes(label)) {
        insights.push(`${label}: ${story.text.slice(0, 100)}...`);
      }
    }
    
    if (text.includes("openclaw")) {
      if (text.includes("cost") || text.includes("token") || text.includes("cheap")) {
        insights.push("💰 Cost reduction tips trending");
      }
      if (text.includes("template") || text.includes("case") || text.includes("example")) {
        insights.push("📦 New use case templates shared");
      }
      if (text.includes("security") || text.includes("hack") || text.includes("vuln")) {
        insights.push("🔒 Security discussion/hardening");
      }
      if (text.includes("chinese") || text.includes("中文") || text.includes("小龙虾")) {
        insights.push("🌏 Chinese community active");
      }
    }
  }
  
  return [...new Set(insights)].slice(0, 5);
};

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
  source?: string;
}

interface CategoryStories {
  stories: Story[];
  insights: string[];
  top_sources: string[];
  sources_used: string[];
  fetched_at: string;
}

const fetchCategoryTweets = async (category: keyof typeof CATEGORIES, xBearerToken: string): Promise<CategoryStories> => {
  const cat = CATEGORIES[category];
  const sources_used: string[] = ["X/Twitter"];
  
  // Try X first, handle 503 gracefully
  let stories: Story[] = [];
  
  try {
    const apiUrl =
      `https://api.twitter.com/2/tweets/search/recent` +
      `?query=${encodeURIComponent(cat.query)}` +
      `&max_results=${cat.maxResults}` +
      `&tweet.fields=created_at,author_id,public_metrics,text,attachments` +
      `&expansions=author_id,attachments.media_keys` +
      `&user.fields=name,username` +
      `&media.fields=url,preview_image_url,type`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${xBearerToken}` },
    });

    if (res.status === 503 || res.status === 429) {
      console.log(`X API unavailable (${res.status}), falling back to Hacker News`);
    } else if (!res.ok) {
      console.error(`X API error for ${category}: ${res.status}`);
    } else {
      const data = await res.json();
      const tweets: any[] = data.data ?? [];
      const users: any[] = data.includes?.users ?? [];
      const mediaItems: any[] = data.includes?.media ?? [];

      const userMap = new Map<string, { name: string; username: string }>(
        users.map((u: any) => [u.id, { name: u.name, username: u.username }])
      );

      const mediaMap = new Map<string, string>(
        mediaItems
          .map((m: any) => [m.media_key, m.url || m.preview_image_url])
          .filter(([, url]) => !!url)
      );

      stories = tweets
        .map((tweet: any) => {
          const author = userMap.get(tweet.author_id);
          const images = (tweet.attachments?.media_keys ?? [])
            .map((key: string) => mediaMap.get(key))
            .filter(Boolean) as string[];

          let text = tweet.text;
          if (images.length > 0) {
            text = text.replace(/\s*https:\/\/t\.co\/\S+$/, "").trim();
          }

          return {
            id: tweet.id,
            author: author?.name ?? "Unknown",
            username: author?.username ?? "",
            text,
            images,
            url: `https://x.com/${author?.username ?? "x"}/status/${tweet.id}`,
            likes: tweet.public_metrics?.like_count ?? 0,
            retweets: tweet.public_metrics?.retweet_count ?? 0,
            created_at: tweet.created_at,
            source: "X/Twitter",
          };
        });
    }
  } catch (e) {
    console.error(`X API exception for ${category}:`, e);
  }

  // If no X stories, try Hacker News as fallback
  if (stories.length === 0) {
    try {
      const hnStories = await fetchHackerNews();
      // Filter HN stories by category keywords
      const categoryKeywords = {
        openclaw: /openclaw|agent|ai/i,
        biotech: /biotech|health|medicine|drug|cancer/i,
        neurotech: /brain|neural|neuro|bci/i,
        intelligence: /intelligence|iq|cognitive|learning/i,
        general: /ai|tech|software|programming|startup/i,
      };
      
      const keyword = categoryKeywords[category];
      if (keyword) {
        const filtered = hnStories.filter(s => keyword.test(s.text));
        if (filtered.length > 0) {
          stories = filtered.slice(0, 5);
          sources_used.push("Hacker News");
        }
      }
    } catch (e) {
      console.error("HN fallback error:", e);
    }
  }

  // Extract top sources
  const top_sources = [...new Set(stories.map(s => s.source || "Unknown"))].slice(0, 3);
  
  // Extract insights
  const insights = extractInsights(stories);

  return {
    stories: stories.slice(0, 10),
    insights,
    top_sources,
    sources_used,
    fetched_at: new Date().toISOString(),
  };
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const xBearerToken = Deno.env.get("X_BEARER_TOKEN")!;
    const authHeader = req.headers.get("Authorization")!;

    // Verify user
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

    if (cached && cached.openclaw && cached.openclaw.stories?.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all categories
    const results: Record<string, CategoryStories> = {};
    const fetchPromises = Object.keys(CATEGORIES).map(async (category) => {
      const stories = await fetchCategoryTweets(category as keyof typeof CATEGORIES, xBearerToken);
      results[category] = {
        stories,
        fetched_at: new Date().toISOString(),
      };
    });

    await Promise.all(fetchPromises);

    // Cache via service role (shared row, one fetch per day)
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
