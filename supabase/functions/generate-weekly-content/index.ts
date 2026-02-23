import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const getISOWeek = (date: Date): string => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNum).padStart(2, "0")}`;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentWeek = getISOWeek(new Date());

    // Return cached content if it exists for this week
    const { data: existing } = await supabase
      .from("weekly_content")
      .select("*")
      .eq("week", currentWeek)
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify(existing), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("openai_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
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
            content: `You are generating weekly critical thinking content for an intelligent, intellectually curious reader.

Fallacy of the Week: Pick a real logical fallacy — not a common one like ad hominem or straw man, but one that is genuinely interesting and worth knowing. Good examples: Motte and Bailey, Overton Window manipulation, appeal to nature, Nirvana fallacy, survivorship bias used as argument, galaxy-brained reasoning, Chesterton's fence. Provide:
- 'fallacy_name': the name of the fallacy
- 'fallacy_explanation': 2-3 sentences. Clear, precise. What the fallacy is and why it's deceptive.
- 'fallacy_example': A concrete, specific real-world example — politics, media, business, or everyday life. Written like a journalist spotting it. 2-3 sentences.

Cognitive Bias of the Week: Pick a real, well-documented cognitive bias — preferably one that is under-discussed or especially relevant to modern life. Good examples: present bias, IKEA effect, the Peltzman effect, scope insensitivity, narrative fallacy, status quo bias, action bias. Provide:
- 'bias_name': the name of the bias
- 'bias_explanation': 2-3 sentences. What it is, why humans have it, when it distorts judgment.
- 'bias_example': A concrete, specific scenario — how it shows up at work, in investing, in politics, or in everyday decisions. 2-3 sentences.

Vary your picks each week. Do not repeat the same fallacy or bias. Use the week identifier to seed variation.

Return ONLY a JSON object with keys: "fallacy_name", "fallacy_explanation", "fallacy_example", "bias_name", "bias_explanation", "bias_example"`,
          },
          {
            role: "user",
            content: `Generate for week: ${currentWeek}`,
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return new Response(JSON.stringify({ error: "OpenAI API error", details: errorText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    const { data: inserted } = await supabase
      .from("weekly_content")
      .upsert({
        week: currentWeek,
        fallacy_name: result.fallacy_name || "",
        fallacy_explanation: result.fallacy_explanation || "",
        fallacy_example: result.fallacy_example || "",
        bias_name: result.bias_name || "",
        bias_explanation: result.bias_explanation || "",
        bias_example: result.bias_example || "",
      }, { onConflict: "week" })
      .select()
      .single();

    return new Response(JSON.stringify(inserted || result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
