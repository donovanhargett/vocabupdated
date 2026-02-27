import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getDateString = () => new Date().toISOString().split("T")[0];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const phToken = Deno.env.get("PH_API_TOKEN");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!phToken) {
      return new Response(JSON.stringify({ error: "Product Hunt API token not configured. Add PH_API_TOKEN to Supabase secrets." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = getDateString();

    // Return cached result for today
    const { data: cached } = await userClient
      .from("daily_ph_products")
      .select("*")
      .eq("date", today)
      .maybeSingle();

    if (cached && Array.isArray(cached.products) && cached.products.length > 0) {
      return new Response(JSON.stringify(cached), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await userClient
      .from("user_settings")
      .select("openai_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Collect product IDs shown in last 14 days to avoid repetition
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const { data: recentRows } = await userClient
      .from("daily_ph_products")
      .select("products")
      .gte("date", fourteenDaysAgo.toISOString().split("T")[0]);

    const recentIds = new Set<string>();
    (recentRows || []).forEach((row: any) => {
      (row.products || []).forEach((p: any) => { if (p.id) recentIds.add(String(p.id)); });
    });

    // Fetch top posts from Product Hunt (last 48 hours for enough volume)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const postedAfter = twoDaysAgo.toISOString().split("T")[0] + "T00:00:00Z";

    const phQuery = `
      query {
        posts(order: VOTES, postedAfter: "${postedAfter}", first: 20) {
          edges {
            node {
              id
              name
              tagline
              description
              url
              votesCount
              website
              thumbnail { url }
              topics { edges { node { name } } }
            }
          }
        }
      }
    `;

    const phRes = await fetch("https://api.producthunt.com/v2/api/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${phToken}`,
        "Accept": "application/json",
      },
      body: JSON.stringify({ query: phQuery }),
    });

    if (!phRes.ok) {
      const errText = await phRes.text();
      throw new Error(`Product Hunt API error ${phRes.status}: ${errText}`);
    }

    const phData = await phRes.json();
    if (phData.errors) {
      throw new Error(`Product Hunt GraphQL error: ${JSON.stringify(phData.errors)}`);
    }

    const allPosts = (phData.data?.posts?.edges || []).map((e: any) => e.node);

    // Filter recently shown; allow repeats if the product is huge (>500 votes)
    const freshPosts = allPosts.filter(
      (p: any) => !recentIds.has(String(p.id)) || p.votesCount > 500
    );

    const pool = freshPosts.length >= 3 ? freshPosts : allPosts;
    const top3 = pool
      .sort((a: any, b: any) => b.votesCount - a.votesCount)
      .slice(0, 3);

    if (top3.length === 0) {
      return new Response(JSON.stringify({ error: "No products found from Product Hunt" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build concise summaries for the AI prompt
    const productSummaries = top3.map((p: any) => ({
      name: p.name,
      tagline: p.tagline,
      description: (p.description || p.tagline || "").slice(0, 300),
      topics: (p.topics?.edges || []).map((e: any) => e.node.name).join(", "),
      votes: p.votesCount,
    }));

    // Single OpenAI call — get JCAL breakdown for all 3 at once
    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${settings.openai_api_key}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are Jason Calacanis (JCAL) — prolific angel investor, founder of LAUNCH, host of This Week in Startups, early investor in Uber, Robinhood, Calm. You have a loud, opinionated, direct VC voice. You get excited about big TAMs and disruptive founders.

For each product provided, generate a VC breakdown. Return a JSON object with a "products" key containing an array of objects — one per product, in the same order they were given — each with these exact keys:

- "one_liner": 1-3 words capturing what it is. Noun phrase only. E.g. "AI legal copilot", "browser automation", "async video standups"
- "what_it_does": 1-2 punchy sentences. What problem, who uses it, why it exists now.
- "ecosystem": Market/space in 2-5 words. E.g. "developer tooling", "enterprise HR tech", "consumer fintech"
- "comparable": Array of exactly 2 well-known companies in the same space. Be specific.
- "jcal_take": 3-4 sentences in JCAL's voice. Hit: market size, what makes this differentiated, key risk or open question, gut read. Be opinionated. Use phrases like "this is a massive TAM", "the question is whether they can...", "if they nail the enterprise motion...", "I'd want to know...", "this is the type of bet I'd make early".
- "verdict": Exactly one of: "strong signal", "interesting", "too early"`,
          },
          {
            role: "user",
            content: `Give me the JCAL breakdown for these ${top3.length} products:\n${JSON.stringify(productSummaries, null, 2)}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiRes.ok) {
      const errText = await openaiRes.text();
      throw new Error(`OpenAI API error: ${errText}`);
    }

    const openaiData = await openaiRes.json();
    const parsed = JSON.parse(openaiData.choices[0].message.content);
    const analyses: any[] = parsed.products || parsed.items || (Array.isArray(parsed) ? parsed : []);

    const products = top3.map((p: any, i: number) => ({
      id: String(p.id),
      name: p.name,
      tagline: p.tagline,
      url: p.url,
      thumbnail: p.thumbnail?.url || null,
      votes: p.votesCount,
      one_liner: analyses[i]?.one_liner || "",
      what_it_does: analyses[i]?.what_it_does || "",
      ecosystem: analyses[i]?.ecosystem || "",
      comparable: analyses[i]?.comparable || [],
      jcal_take: analyses[i]?.jcal_take || "",
      verdict: analyses[i]?.verdict || "interesting",
    }));

    // Cache via service role (shared row, one fetch per day)
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: inserted } = await serviceClient
      .from("daily_ph_products")
      .upsert(
        { date: today, products, fetched_at: new Date().toISOString() },
        { onConflict: "date" }
      )
      .select()
      .single();

    return new Response(JSON.stringify(inserted ?? { date: today, products }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message ?? "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
