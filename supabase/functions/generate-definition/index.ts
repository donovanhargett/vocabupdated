import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestBody {
  word: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: settings } = await supabase
      .from("user_settings")
      .select("openai_api_key")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!settings?.openai_api_key) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { word }: RequestBody = await req.json();

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
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
              content:
                "You are a vocabulary assistant. Return ONLY a JSON object with five keys: 'definition', 'tldr', 'pronunciation', 'synonyms', 'example'.\n\n'definition': One formal, complete sentence. Buttoned-up dictionary style.\n\n'tldr': A funny one-liner — a mini situation or character sketch, not synonyms. Examples: 'something mildly inconvenient happens and he treats it like a CIA operation' (thwart) / 'seven beers in and suddenly he\\'s a zealot for personal responsibility' (zealot). One sentence, absurd, specific.\n\n'pronunciation': Simple, readable phonetic spelling. Uppercase the stressed syllable. Examples: 'SEM-in-ul' / 'THWORT' / 'ZEE-lut'. No IPA symbols.\n\n'synonyms': Array of exactly 2 single-word synonyms.\n\n'example': Exactly 3 short sentences as a JSON array. EVERY sentence must use the word being defined — no exceptions. Sentences 1 and 2: frat/lax bro world — drinking, house parties, pregames, tailgates, the gym, lacrosse, beer pong, group chats, Sunday Scaries, Uber home from the bar. Lowercase fine, punchy. Sentence 3: professional/corporate — a sharp exec or consultant using the word naturally in a meeting or email, no forced definitions. Examples: 'The Q3 results were seminal in shifting the board\\'s appetite for risk.' / 'Any attempt to thwart the integration timeline will have downstream consequences.' / 'His zealot-level conviction on the go-to-market was either visionary or a liability.'",
            },
            {
              role: "user",
              content: `Define the word: ${word}`,
            },
          ],
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      return new Response(
        JSON.stringify({ error: "OpenAI API error", details: error }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const result = JSON.parse(openaiData.choices[0].message.content);

    return new Response(
      JSON.stringify({
        definition: result.definition,
        tldr: result.tldr || "",
        pronunciation: result.pronunciation || "",
        synonyms: Array.isArray(result.synonyms) ? result.synonyms : [],
        example: result.example,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
