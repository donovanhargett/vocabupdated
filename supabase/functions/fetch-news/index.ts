import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// ISO 8601 timestamp for 48 hours ago (within X API's 7-day window)
const get48hAgoISO = () => {
  const d = new Date();
  d.setHours(d.getHours() - 48);
  return d.toISOString().replace(/\.\d{3}Z$/, "Z");
};

// ── Top 20 accounts — fits in a single query under the 512-char free-tier limit (~376 chars)
// One API call per day eliminates rate-limit issues
const ACCOUNTS = [
  // Core VC / all-in pod
  "elonmusk", "chamath", "Jason", "DavidSacks", "pmarca", "a16z", "Friedberg", "eladgil",
  // Core AI / tech
  "sama", "karpathy", "lexfridman", "ylecun",
  // Neurotech / BCI
  "neuralink", "cb_doge", "NeuroTechX", "XFreeze", "tetsuoai",
  // Emerging tech
  "alliekmiller", "rowancheung", "AndrewYNg",
];

const ACCOUNT_QUERY =
  `(${ACCOUNTS.map((a) => `from:${a}`).join(" OR ")}) -is:retweet -is:reply lang:en`;

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

    // ── Fetch from X API v2 — single request per day (free tier: 1 req / 15 min) ──
    const startTime = get48hAgoISO();
    const apiUrl =
      `https://api.twitter.com/2/tweets/search/recent` +
      `?query=${encodeURIComponent(ACCOUNT_QUERY)}` +
      `&max_results=20` +
      `&start_time=${encodeURIComponent(startTime)}` +
      `&tweet.fields=created_at,author_id,public_metrics,text` +
      `&expansions=author_id` +
      `&user.fields=name,username`;

    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${xBearerToken}` },
    });
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`X API error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    const tweets: any[] = data.data ?? [];
    const users: any[] = data.includes?.users ?? [];

    const userMap = new Map<string, { name: string; username: string }>(
      users.map((u) => [u.id, { name: u.name, username: u.username }])
    );

    const stories = tweets
      .map((tweet: any) => {
        const author = userMap.get(tweet.author_id);
        return {
          id: tweet.id,
          author: author?.name ?? "Unknown",
          username: author?.username ?? "",
          text: tweet.text,
          url: `https://x.com/${author?.username ?? "x"}/status/${tweet.id}`,
          likes: tweet.public_metrics?.like_count ?? 0,
          retweets: tweet.public_metrics?.retweet_count ?? 0,
          created_at: tweet.created_at,
        };
      })
      .sort((a: any, b: any) => (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2))
      .slice(0, 20);

    // Cache via service role (shared across all users)
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
