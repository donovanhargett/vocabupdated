import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface RawSource {
  title: string;
  snippet: string;
  url: string;
  source: string; // "X", "Reddit", "Hacker News"
  author: string;
  engagement: number;
  created_at: string;
}

interface CategoryBrief {
  summary: string;
  highlights: string[];
  sources: { title: string; url: string; source: string; author: string }[];
  fetched_at: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CATEGORY CONFIGURATION
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES: Record<
  string,
  {
    name: string;
    xQueries: string[];
    subreddits: string[];
    hnKeywords: string[];
    briefPrompt: string;
  }
> = {
  openclaw: {
    name: "OpenClaw",
    xQueries: [
      '"openclaw" OR "open claw" OR @openclawai -is:retweet lang:en',
    ],
    subreddits: ["openclaw", "ArtificialIntelligence", "LocalLLaMA", "ChatGPT"],
    hnKeywords: ["openclaw", "open claw", "ai agent"],
    briefPrompt:
      "OpenClaw AI platform — agent framework, skills, deployment, community updates",
  },
  biotech: {
    name: "Biotech",
    xQueries: [
      "CRISPR OR gene therapy OR mRNA OR FDA approval OR clinical trial -is:retweet lang:en",
      "drug discovery OR gene editing OR cell therapy OR biotech -is:retweet lang:en",
    ],
    subreddits: ["biotech", "genomics", "labrats", "bioinformatics"],
    hnKeywords: [
      "biotech",
      "crispr",
      "gene therapy",
      "mrna",
      "fda",
      "clinical trial",
      "drug discovery",
      "genomics",
    ],
    briefPrompt:
      "Biotechnology — gene editing, drug discovery, clinical trials, FDA, therapeutics, diagnostics",
  },
  neurotech: {
    name: "Neurotech",
    xQueries: [
      "neuralink OR brain-computer interface OR BCI OR neural implant -is:retweet lang:en",
      "neurostimulation OR EEG OR brain mapping OR connectome -is:retweet lang:en",
    ],
    subreddits: ["neurotechnology", "neuralink", "neuroscience", "BCI"],
    hnKeywords: [
      "neuralink",
      "brain computer interface",
      "bci",
      "neural implant",
      "neuroprosthetic",
      "eeg",
      "brain machine",
    ],
    briefPrompt:
      "Neurotechnology — brain-computer interfaces, neural implants, neuralink, EEG, brain mapping",
  },
  intelligence: {
    name: "Intelligence",
    xQueries: [
      "cognitive enhancement OR nootropics OR IQ research OR fluid intelligence -is:retweet lang:en",
      "neuroplasticity OR brain training OR cognitive science -is:retweet lang:en",
    ],
    subreddits: [
      "cognitivescience",
      "nootropics",
      "neuropsychology",
      "intelligence",
    ],
    hnKeywords: [
      "cognitive",
      "intelligence",
      "nootropics",
      "neuroplasticity",
      "brain training",
      "iq",
    ],
    briefPrompt:
      "Intelligence & cognition — cognitive enhancement, nootropics, brain training, IQ research, neuroplasticity",
  },
  general: {
    name: "General Tech",
    xQueries: [
      "AI agent OR autonomous AI OR open source AI OR LLM OR GPT -is:retweet lang:en",
      "startup funding OR YC OR Series A OR tech launch -is:retweet lang:en",
    ],
    subreddits: ["technology", "programming", "machinelearning", "artificial"],
    hnKeywords: [
      "ai",
      "llm",
      "gpt",
      "startup",
      "open source",
      "machine learning",
    ],
    briefPrompt:
      "General technology — AI/ML, startups, open source, software, major tech news",
  },
  hrv: {
    name: "Heart Rate Variability",
    xQueries: [
      "heart rate variability OR HRV OR vagal tone OR autonomic -is:retweet lang:en",
      "HRV training OR HRV biofeedback OR WHOOP OR Oura -is:retweet lang:en",
    ],
    subreddits: [
      "hrv",
      "quantifiedself",
      "biohacking",
      "whoop",
      "ouraring",
      "Fitness",
      "health",
    ],
    hnKeywords: [
      "heart rate variability",
      "hrv",
      "vagal tone",
      "autonomic",
      "biofeedback",
    ],
    briefPrompt:
      "Heart Rate Variability — HRV science, biofeedback, wearables (WHOOP, Oura), recovery, stress management, autonomic health",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// X / TWITTER SOURCE (OAuth 2.0 with Client Credentials)
// ─────────────────────────────────────────────────────────────────────────────

// Get OAuth 2.0 access token using client credentials
const getXAccessToken = async (): Promise<string | null> => {
  const consumerKey = Deno.env.get("X_CONSUMER_KEY");
  const consumerSecret = Deno.env.get("X_CONSUMER_SECRET");
  
  if (!consumerKey || !consumerSecret) {
    return Deno.env.get("X_BEARER_TOKEN") ?? null;
  }
  
  try {
    const credentials = btoa(`${consumerKey}:${consumerSecret}`);
    const res = await fetch("https://api.twitter.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${credentials}`,
      },
      body: "grant_type=client_credentials",
    });
    
    if (!res.ok) {
      console.error(`X OAuth failed ${res.status}: ${await res.text()}`);
      return Deno.env.get("X_BEARER_TOKEN") ?? null;
    }
    
    const data = await res.json();
    return data.access_token ?? null;
  } catch (e) {
    console.error("X OAuth error:", e);
    return Deno.env.get("X_BEARER_TOKEN") ?? null;
  }
};

const fetchX = async (queries: string[]): Promise<RawSource[]> => {
  const accessToken = await getXAccessToken();
  if (!accessToken) {
    console.warn("No X access token available, skipping X");
    return [];
  }

  const allStories: RawSource[] = [];

  // Try v2 recent search first (requires elevated access)
  for (const query of queries) {
    try {
      let url =
        `https://api.twitter.com/2/tweets/search/recent` +
        `?query=${encodeURIComponent(query)}` +
        `&max_results=15` +
        `&sort_order=relevancy` +
        `&tweet.fields=created_at,author_id,public_metrics,text` +
        `&expansions=author_id` +
        `&user.fields=name,username`;

      let res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      // If v2 fails (likely no elevated access), try v1.1 search
      if (!res.ok) {
        console.warn(`X v2 failed ${res.status}, trying v1.1`);
        url = `https://api.twitter.com/1.1/search/tweets.json?q=${encodeURIComponent(query)}&result_type=popular&count=15`;
        res = await fetch(url, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        
        if (!res.ok) {
          console.error(`X v1.1 also failed ${res.status}: ${await res.text()}`);
          continue;
        }
        
        const v1data = await res.json();
        const tweets = v1data.statuses ?? [];
        
        for (const t of tweets) {
          allStories.push({
            title: "",
            snippet: t.text?.replace(/\s*https:\/\/t\.co\/\S+$/g, "").trim() ?? "",
            url: `https://twitter.com/${t.user?.screen_name}/status/${t.id_str}`,
            source: "X",
            author: `@${t.user?.screen_name ?? "unknown"} (${t.user?.name ?? ""})`,
            engagement: (t.retweet_count ?? 0) * 2 + (t.favorite_count ?? 0),
            created_at: t.created_at,
          });
        }
        continue;
      }

      const data = await res.json();
      const tweets: any[] = data.data ?? [];
      const users = new Map(
        (data.includes?.users ?? []).map((u: any) => [u.id, u])
      );

      for (const t of tweets) {
        const author = users.get(t.author_id);
        const likes = t.public_metrics?.like_count ?? 0;
        const rts = t.public_metrics?.retweet_count ?? 0;
        allStories.push({
          title: "",
          snippet: t.text.replace(/\s*https:\/\/t\.co\/\S+$/g, "").trim(),
          url: `https://x.com/${author?.username ?? "x"}/status/${t.id}`,
          source: "X",
          author: author
            ? `@${author.username} (${author.name})`
            : "Unknown",
          engagement: likes + rts * 2,
          created_at: t.created_at,
        });
      }
    } catch (e) {
      console.error("X fetch error:", e);
    }
  }

  return allStories;
};

// ─────────────────────────────────────────────────────────────────────────────
// REDDIT SOURCE
// ─────────────────────────────────────────────────────────────────────────────

const fetchRedditPosts = async (subreddits: string[]): Promise<RawSource[]> => {
  const allStories: RawSource[] = [];

  for (const sub of subreddits) {
    try {
      // Try hot first, then new as fallback
      let res = await fetch(
        `https://www.reddit.com/r/${sub}/hot.json?limit=15&t=day`,
        { headers: { "User-Agent": "VocabUpdated/2.0 (news aggregator)" } }
      );

      if (!res.ok) {
        // Try new posts as fallback
        console.warn(`Reddit r/${sub} hot returned ${res.status}, trying new`);
        res = await fetch(
          `https://www.reddit.com/r/${sub}/new.json?limit=15`,
          { headers: { "User-Agent": "VocabUpdated/2.0 (news aggregator)" } }
        );
        if (!res.ok) {
          console.warn(`Reddit r/${sub} also failed: ${res.status}`);
          continue;
        }
      }

      const data = await res.json();
      const posts: any[] = data.data?.children ?? [];

      for (const p of posts) {
        const d = p.data;
        if (d.stickied) continue;
        allStories.push({
          title: d.title,
          snippet: d.selftext ? d.selftext.slice(0, 600) : "",
          url: d.url?.startsWith("https://www.reddit.com")
            ? d.url
            : `https://www.reddit.com${d.permalink}`,
          source: `Reddit r/${sub}`,
          author: `u/${d.author}`,
          engagement: d.score ?? 0,
          created_at: new Date((d.created_utc ?? 0) * 1000).toISOString(),
        });
      }
    } catch (e) {
      console.error(`Reddit r/${sub} error:`, e);
    }
  }

  return allStories;
};

// ─────────────────────────────────────────────────────────────────────────────
// HACKER NEWS SOURCE
// ─────────────────────────────────────────────────────────────────────────────

const fetchHN = async (keywords: string[]): Promise<RawSource[]> => {
  try {
    // Use Algolia HN search API for keyword-filtered results
    const kw = keywords.slice(0, 3).join(" OR ");
    const res = await fetch(
      `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(
        kw
      )}&tags=story&hitsPerPage=15&numericFilters=created_at_i>${Math.floor(Date.now() / 1000) - 86400 * 2}`
    );

    if (!res.ok) return [];

    const data = await res.json();
    return (data.hits ?? []).map((h: any) => ({
      title: h.title ?? "",
      snippet: "",
      url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
      source: "Hacker News",
      author: h.author ?? "Unknown",
      engagement: h.points ?? 0,
      created_at: h.created_at ?? new Date().toISOString(),
    }));
  } catch (e) {
    console.error("HN error:", e);
    return [];
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GPT BRIEF GENERATION
// ─────────────────────────────────────────────────────────────────────────────

const generateBrief = async (
  categoryName: string,
  briefPrompt: string,
  sources: RawSource[]
): Promise<{ summary: string; highlights: string[] }> => {
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  // If no OpenAI key, produce a simple extractive summary
  if (!openaiKey || sources.length === 0) {
    const top = sources.slice(0, 8);
    return {
      summary: top.length
        ? `Today in ${categoryName}: ${top
            .slice(0, 3)
            .map((s) => s.title || s.snippet.slice(0, 80))
            .join(". ")}...`
        : `No significant ${categoryName} news found today.`,
      highlights: top
        .slice(0, 5)
        .map(
          (s, i) =>
            `${i + 1}. ${s.title || s.snippet.slice(0, 120)} [${s.source}]`
        ),
    };
  }

  // Build source digest for GPT
  const digest = sources
    .slice(0, 20)
    .map(
      (s, i) =>
        `[${i + 1}] (${s.source}) ${s.title ? s.title + ": " : ""}${s.snippet.slice(0, 300)}${s.url ? ` — ${s.url}` : ""}`
    )
    .join("\n");

  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.4,
        max_tokens: 800,
        messages: [
          {
            role: "system",
            content: `You are a concise tech news briefing writer. Topic focus: ${briefPrompt}.
Write a daily brief from the sources provided. Be specific — mention names, products, numbers.
Return JSON: { "summary": "2-4 sentence overview paragraph", "highlights": ["bullet 1", "bullet 2", ...up to 5] }
Each highlight should be one impactful sentence. Reference which source platform (X, Reddit, HN) when relevant.
Only valid JSON, no markdown fences.`,
          },
          {
            role: "user",
            content: `Today's raw sources for ${categoryName}:\n\n${digest}`,
          },
        ],
      }),
    });

    if (!res.ok) {
      console.error(`OpenAI ${res.status}: ${await res.text()}`);
      throw new Error("OpenAI failed");
    }

    const completion = await res.json();
    const text = completion.choices?.[0]?.message?.content?.trim() ?? "";

    // Parse JSON from response (handle possible markdown fences)
    const jsonStr = text.replace(/^```json?\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(jsonStr);

    return {
      summary: parsed.summary || "",
      highlights: Array.isArray(parsed.highlights)
        ? parsed.highlights.slice(0, 5)
        : [],
    };
  } catch (e) {
    console.error("Brief generation error:", e);
    // Fallback to extractive
    const top = sources.slice(0, 5);
    return {
      summary: `Today in ${categoryName}: ${top
        .slice(0, 3)
        .map((s) => s.title || s.snippet.slice(0, 80))
        .join(". ")}`,
      highlights: top.map(
        (s, i) =>
          `${i + 1}. ${s.title || s.snippet.slice(0, 120)} [${s.source}]`
      ),
    };
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// FETCH CATEGORY (all sources → brief)
// ─────────────────────────────────────────────────────────────────────────────

const fetchCategory = async (
  key: string
): Promise<CategoryBrief> => {
  const config = CATEGORIES[key];
  const allSources: RawSource[] = [];

  // Fetch all sources in parallel
  const [xResults, redditResults, hnResults] = await Promise.all([
    fetchX(config.xQueries),
    fetchRedditPosts(config.subreddits),
    fetchHN(config.hnKeywords),
  ]);

  console.log(
    `[${key}] X: ${xResults.length}, Reddit: ${redditResults.length}, HN: ${hnResults.length}`
  );

  allSources.push(...xResults, ...redditResults, ...hnResults);

  // Deduplicate by similar text
  const seen = new Set<string>();
  const unique = allSources.filter((s) => {
    const fingerprint = (s.title || s.snippet).slice(0, 60).toLowerCase();
    if (seen.has(fingerprint)) return false;
    seen.add(fingerprint);
    return true;
  });

  // Sort by engagement
  const sorted = unique.sort((a, b) => b.engagement - a.engagement);

  // Generate brief
  const { summary, highlights } = await generateBrief(
    config.name,
    config.briefPrompt,
    sorted
  );

  // Top sources for reference
  const topSources = sorted.slice(0, 10).map((s) => ({
    title: s.title || s.snippet.slice(0, 100),
    url: s.url,
    source: s.source,
    author: s.author,
  }));

  return {
    summary,
    highlights,
    sources: topSources,
    fetched_at: new Date().toISOString(),
  };
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

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getDateString();

    // Check cache — serve if we have a brief with a summary (not raw tweets)
    const { data: cached } = await userClient
      .from("daily_news")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (cached?.openclaw?.summary) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all categories in parallel
    const categoryKeys = Object.keys(CATEGORIES);
    const results = await Promise.all(
      categoryKeys.map((k) => fetchCategory(k))
    );

    const payload: Record<string, any> = { date: today };
    categoryKeys.forEach((k, i) => {
      payload[k] = results[i];
    });
    payload.fetched_at = new Date().toISOString();

    // Cache in database
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_news")
      .upsert(payload, { onConflict: "date" })
      .select()
      .single();

    return new Response(JSON.stringify(inserted ?? payload), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Handler error:", error);
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
