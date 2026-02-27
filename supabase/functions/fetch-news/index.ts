import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// ── Followed accounts (~376 chars — under free-tier 512 char limit) ───────────
const ACCOUNTS = [
  "elonmusk", "chamath", "Jason", "DavidSacks", "pmarca", "a16z", "Friedberg", "eladgil",
  "sama", "karpathy", "lexfridman", "ylecun",
  "neuralink", "cb_doge", "NeuroTechX", "XFreeze", "tetsuoai",
  "alliekmiller", "rowancheung", "AndrewYNg",
];

const ACCOUNT_QUERY =
  `(${ACCOUNTS.map((a) => `from:${a}`).join(" OR ")}) -is:retweet -is:reply lang:en`;

// ── Content filter ────────────────────────────────────────────────────────────
// A tweet must contain at least one tech signal term AND must not contain
// any cynical/negative markers to pass through.

const TECH_SIGNALS = [
  "ai", "startup", "launch", "launches", "funding", "raise", "raised", "round",
  "model", "bci", "neural", "neuro", "compute", "llm", "research", "agent",
  "breakthrough", "invest", "venture", "built", "ship", "shipped", "product",
  "technology", "open source", "demo", "release", "announced", "acquire",
  "neurotech", "robot", "robotics", "automation", "chip", "semiconductor",
  "quantum", "biotech", "implant", "billion", "trillion", "series a", "series b",
  "partnership", "infrastructure", "data center", "inference", "training",
  "multimodal", "foundation model", "open ai", "anthropic", "deepmind", "nvidia",
  "hardware", "deploy", "api", "cloud", "agi", "reasoning", "benchmark",
];

const BLOCK_SIGNALS = [
  "idiot", "moron", "stupid", "pathetic", "terrible", "awful",
  "liar", "lie", "corrupt", "fraud", "scam", "criminal", "garbage", "trash",
  "embarrassing", "shameful", "ridiculous", "clown", "hoax", "disgusting",
  "propaganda", "evil", "loser", "failure", "incompetent", "disaster",
  "hypocrite", "coward", "woke", "racist", "fascist", "communist",
];

const isTechContent = (text: string): boolean => {
  const lower = text.toLowerCase();
  for (const bad of BLOCK_SIGNALS) {
    if (lower.includes(bad)) return false;
  }
  for (const term of TECH_SIGNALS) {
    if (lower.includes(term)) return true;
  }
  return false;
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

    if (cached && Array.isArray(cached.stories) && cached.stories.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── Fetch from X API v2 (single request per day) ─────────────────────────
    // Request 20 to have a pool to filter from — after content filtering,
    // we return the top 10 emerging-tech posts ranked by engagement.
    const apiUrl =
      `https://api.twitter.com/2/tweets/search/recent` +
      `?query=${encodeURIComponent(ACCOUNT_QUERY)}` +
      `&max_results=20` +
      `&tweet.fields=created_at,author_id,public_metrics,text,attachments` +
      `&expansions=author_id,attachments.media_keys` +
      `&user.fields=name,username` +
      `&media.fields=url,preview_image_url,type`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${xBearerToken}` },
    });

    if (res.status === 429) {
      return new Response(
        JSON.stringify({ error: "X API rate limit — free tier allows 1 request per 15 minutes. Wait a moment and try again." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`X API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const tweets: any[] = data.data ?? [];
    const users: any[] = data.includes?.users ?? [];
    const mediaItems: any[] = data.includes?.media ?? [];

    const userMap = new Map<string, { name: string; username: string }>(
      users.map((u: any) => [u.id, { name: u.name, username: u.username }])
    );

    // Map media_key → URL (photo url, or video preview image)
    const mediaMap = new Map<string, string>(
      mediaItems
        .map((m: any) => [m.media_key, m.url || m.preview_image_url])
        .filter(([, url]) => !!url)
    );

    const stories = tweets
      .map((tweet: any) => {
        const author = userMap.get(tweet.author_id);
        const images = (tweet.attachments?.media_keys ?? [])
          .map((key: string) => mediaMap.get(key))
          .filter(Boolean) as string[];

        // Strip trailing t.co media link — it's the attached image, shown separately
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
        };
      })
      // Keep only informational emerging-tech content; drop cynical/political posts
      .filter((t: any) => isTechContent(t.text))
      // Rank by engagement (retweets weighted 2x — stronger signal of value)
      .sort((a: any, b: any) => (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2))
      .slice(0, 10);

    // Cache via service role (shared row, one fetch per day)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_news")
      .upsert(
        { date: today, stories, fetched_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();

    return new Response(JSON.stringify(inserted ?? { date: today, stories }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
