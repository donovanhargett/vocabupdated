import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
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

    const body = await req.json().catch(() => ({}));
    const contentDate = body.date || new Date().toISOString().split("T")[0];

    // Return cached content only if it already has topic data
    const { data: existing } = await supabase
      .from("daily_content")
      .select("*")
      .eq("date", contentDate)
      .maybeSingle();

    if (existing && existing.topic_title && existing.topic_why_it_matters) {
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
            content: `You are generating daily content for a curious, intelligent reader who works in or around business and tech.

Word of the Day: Choose a sophisticated word that Michael Tracey — the independent journalist known for contrarian foreign policy takes, media criticism, and on-the-ground conflict reporting — might use in his writing or tweets. Use erudite, precise vocabulary from political commentary, journalism, or foreign affairs. Include a tight definition and a punchy example sentence written in his voice.

Idiom of the Day: Choose an idiom or phrase that David Sacks — tech investor, All-In Podcast co-host, and political commentator — would actually say. Think business/VC jargon blended with political commentary: power dynamics, institutional capture, market forces, narrative control. Include what it means and an example of him saying it.

Topic of the Day: This is a mini deep dive — think Chamath Palihapitiya's deep dives on Substack. Pick one specific, concrete concept from these domains (rotate through them): neurotech, artificial intelligence, oil & gas, computing architecture, intelligence/geopolitics, biotech, energy infrastructure, defense tech, financial systems. Pick a specific concept or process — NOT a broad overview. Good examples: how upstream oil drilling works, how a transformer attention mechanism processes a token, how brain-computer interfaces read neural signals, how a CPU out-of-order execution pipeline works, how SIGINT collection and tasking works, how mRNA vaccines are manufactured, how HVDC power transmission works, how autonomous weapons targeting systems work.

Generate five sections:

1. 'topic_explanation': 4-6 sentences. Clear and precise, written for a smart generalist with zero background. Explain exactly what it is and how it works mechanically.

2. 'topic_why_it_matters': 3-4 sentences. Why does this topic matter RIGHT NOW? What is the real-world consequence, the business angle, the geopolitical angle, or the societal shift this concept is driving? Make it feel urgent and relevant.

3. 'topic_first_principles': 4-6 sentences. Strip the jargon away entirely. What are the fundamental laws, forces, or logic that make this thing work or not work? Start from physics, economics, biology, or pure logic — whatever is most appropriate — and build up to the concept. Think: what would Feynman write if he had to explain the core mechanic to a physicist from a different field?

4. 'topic_questions': A JSON array of exactly 4 strings. These are sharp, specific questions the reader should go ask, research, or think about to go deeper. Not generic ("What is X?") but pointed and investigative ("Why does X fail under Y condition?", "Who controls the chokepoint for Z?"). Each question should open a rabbit hole.

5. 'topic_feynman': 2-3 sentences. Explain it like the reader is in 5th grade. One vivid analogy. Zero jargon.

Return ONLY a JSON object with keys: "word", "word_definition", "word_example", "idiom", "idiom_explanation", "idiom_example", "topic_title", "topic_explanation", "topic_why_it_matters", "topic_first_principles", "topic_questions", "topic_feynman"`,
          },
          {
            role: "user",
            content: `Generate for date: ${contentDate}`,
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
      .from("daily_content")
      .upsert({
        date: contentDate,
        word: result.word,
        word_definition: result.word_definition,
        word_example: result.word_example || "",
        idiom: result.idiom,
        idiom_explanation: result.idiom_explanation,
        idiom_example: result.idiom_example || "",
        topic_title: result.topic_title || "",
        topic_explanation: result.topic_explanation || "",
        topic_why_it_matters: result.topic_why_it_matters || "",
        topic_first_principles: result.topic_first_principles || "",
        topic_questions: Array.isArray(result.topic_questions) ? result.topic_questions : [],
        topic_feynman: result.topic_feynman || "",
      }, { onConflict: "date" })
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
