import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

const getYesterdayString = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split("T")[0];
};

// Quality sources only — no mainstream fluff
const TRUSTED_DOMAINS = [
  "techcrunch.com",
  "wired.com",
  "arstechnica.com",
  "theverge.com",
  "reuters.com",
  "axios.com",
  "technologyreview.com",
  "wsj.com",
  "ft.com",
  "bloomberg.com",
  "ieee.org",
  "nature.com",
  "economist.com",
  "stratechery.com",
].join(",");

const NEWS_KEYWORDS =
  `"artificial intelligence" OR neurotech OR "brain computer interface" OR ` +
  `"venture capital" OR "large language model" OR "OpenAI" OR "Sam Altman" OR ` +
  `"AI funding" OR semiconductor OR "AI startup" OR "Anthropic" OR "xAI"`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const grokApiKey = Deno.env.get("X_BEARER_TOKEN")!;   // xAI Grok API key
    const newsApiKey = Deno.env.get("NEWSAPI_KEY")!;
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

    // Check cache — only skip if we have both sections populated
    const { data: cached } = await userClient
      .from("daily_news")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (cached && Array.isArray(cached.x_brief) && cached.x_brief.length > 0
        && Array.isArray(cached.stories) && cached.stories.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── PART 1: Grok → X brief ────────────────────────────────────────────────
    // Grok has real-time X data access. We ask it to summarize what the key
    // people in tech/VC are saying on X right now.
    let xBrief: any[] = [];
    try {
      const grokRes = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${grokApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "grok-2-latest",
          messages: [
            {
              role: "system",
              content:
                "You have access to real-time X (Twitter) data. You are a sharp, concise morning briefing assistant for an investor and technologist. Your reader is intelligent, busy, and hates fluff. They follow: emerging technology (AI, LLMs, neurotech, BCI), venture capital, geopolitics as it relates to tech, and high-signal thinkers.",
            },
            {
              role: "user",
              content:
                `Search X for the most interesting and substantive posts from the last 24 hours from these accounts: ` +
                `@chamath (Chamath Palihapitiya), @DavidSacks, @Friedberg (David Friedberg), @Jason (Jason Calacanis). ` +
                `Also pull in anything major from @sama (Sam Altman), @naval, @paulg, @elonmusk, @demishassabis ` +
                `if it's directly relevant to AI, tech, or markets. ` +
                `Skip retweets, hot takes, mundane commentary, and self-promotion. ` +
                `Focus on: deals, predictions, analysis, breaking news, and interesting contrarian takes.\n\n` +
                `Return 2-3 items as JSON:\n` +
                `{\n` +
                `  "x_brief": [\n` +
                `    {\n` +
                `      "author": "Full Name",\n` +
                `      "username": "handle_without_at",\n` +
                `      "summary": "2-3 sentences. What they said and why it matters. Be direct.",\n` +
                `      "topic": "AI" | "VC" | "neurotech" | "geopolitics" | "markets" | "other"\n` +
                `    }\n` +
                `  ]\n` +
                `}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      });

      if (grokRes.ok) {
        const grokData = await grokRes.json();
        const parsed = JSON.parse(grokData.choices[0].message.content);
        xBrief = parsed.x_brief ?? [];
      } else {
        const errText = await grokRes.text();
        console.error("Grok API error:", grokRes.status, errText);
      }
    } catch (e) {
      console.error("Grok fetch failed:", e);
    }

    // ── PART 2: NewsAPI → quality articles ────────────────────────────────────
    let articles: any[] = [];
    try {
      const yesterday = getYesterdayString();
      const newsUrl =
        `https://newsapi.org/v2/everything` +
        `?q=${encodeURIComponent(NEWS_KEYWORDS)}` +
        `&domains=${encodeURIComponent(TRUSTED_DOMAINS)}` +
        `&sortBy=publishedAt` +
        `&pageSize=10` +
        `&language=en` +
        `&from=${yesterday}` +
        `&apiKey=${newsApiKey}`;

      const newsRes = await fetch(newsUrl);
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        articles = (newsData.articles ?? [])
          .filter((a: any) => a.title && a.url && a.title !== "[Removed]" && a.description)
          .slice(0, 3)
          .map((a: any) => ({
            title: a.title,
            source: a.source?.name ?? "Unknown",
            description: a.description,
            url: a.url,
            published_at: a.publishedAt,
          }));
      } else {
        const errText = await newsRes.text();
        console.error("NewsAPI error:", newsRes.status, errText);
      }
    } catch (e) {
      console.error("NewsAPI fetch failed:", e);
    }

    // ── Cache + return ────────────────────────────────────────────────────────
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_news")
      .upsert(
        { date: today, stories: articles, x_brief: xBrief, fetched_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();

    return new Response(
      JSON.stringify(inserted ?? { date: today, stories: articles, x_brief: xBrief }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
