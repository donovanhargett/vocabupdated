import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

// X accounts we follow: chamath, DavidSacks, Friedberg, Jason Calacanis
const ACCOUNT_QUERY =
  "(from:chamath OR from:DavidSacks OR from:Friedberg OR from:Jason) -is:retweet -is:reply lang:en";

// Broader tech topics as a secondary search (used only if primary returns < 2 results)
const TECH_QUERY =
  "(neurotech OR \"brain computer interface\" OR \"venture capital\" OR \"emerging tech\" OR \"AI funding\") -is:retweet -is:reply lang:en min_faves:200";

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

    // Check cache — serve today's news if already fetched
    const { data: cached } = await userClient
      .from("daily_news")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (cached) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fetch from X API v2 ---
    const fetchTweets = async (query: string, maxResults = 20) => {
      const url =
        `https://api.twitter.com/2/tweets/search/recent` +
        `?query=${encodeURIComponent(query)}` +
        `&max_results=${maxResults}` +
        `&tweet.fields=created_at,author_id,public_metrics,text` +
        `&expansions=author_id` +
        `&user.fields=name,username`;

      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${xBearerToken}` },
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`X API error ${res.status}: ${err}`);
      }
      return res.json();
    };

    // Primary: tweets from the specific accounts
    const primaryData = await fetchTweets(ACCOUNT_QUERY, 20);
    const primaryTweets: any[] = primaryData.data || [];
    const users: any[] = primaryData.includes?.users || [];

    // Secondary: broader tech topics if we don't have enough
    let secondaryTweets: any[] = [];
    let secondaryUsers: any[] = [];
    if (primaryTweets.length < 2) {
      const secondaryData = await fetchTweets(TECH_QUERY, 15);
      secondaryTweets = secondaryData.data || [];
      secondaryUsers = secondaryData.includes?.users || [];
    }

    // Build user lookup map
    const userMap = new Map<string, { name: string; username: string }>(
      [...users, ...secondaryUsers].map((u) => [u.id, { name: u.name, username: u.username }])
    );

    // Shape + score each tweet by engagement
    const shape = (tweet: any) => {
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
    };

    const allTweets = [...primaryTweets, ...secondaryTweets].map(shape);

    // Deduplicate by id, sort by engagement, take top 3
    const seen = new Set<string>();
    const stories = allTweets
      .filter((t) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
      })
      .sort((a, b) => (b.likes + b.retweets * 2) - (a.likes + a.retweets * 2))
      .slice(0, 3);

    // Upsert with service role key so we can write shared news for all users
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_news")
      .upsert({ date: today, stories, fetched_at: new Date().toISOString() }, { onConflict: "date" })
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
