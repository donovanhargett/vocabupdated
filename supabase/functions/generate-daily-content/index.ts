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

    // Return cached content if it already exists for this date
    const { data: existing } = await supabase
      .from("daily_content")
      .select("*")
      .eq("date", contentDate)
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
            content: `You are generating daily vocabulary content for a politically-engaged, media-savvy audience.

Word of the Day: Choose a sophisticated word that Michael Tracey — the independent journalist known for contrarian foreign policy takes, media criticism, and on-the-ground conflict reporting — might use in his writing or tweets. Use erudite, precise vocabulary from political commentary, journalism, or foreign affairs. Include a tight definition and a punchy example sentence written in his voice.

Idiom of the Day: Choose an idiom or phrase that David Sacks — tech investor, All-In Podcast co-host, and political commentator — would actually say. Think business/VC jargon blended with political commentary: power dynamics, institutional capture, market forces, narrative control. Include what it means and an example of him saying it.

Return ONLY a JSON object with keys: "word", "word_definition", "word_example", "idiom", "idiom_explanation", "idiom_example"`,
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
