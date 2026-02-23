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
                "You are a vocabulary assistant. Return ONLY a JSON object with three keys: 'definition', 'tldr', 'example'.\n\n'definition': One formal, complete sentence. Buttoned-up. Like something from a well-written dictionary. Example: 'Seminal refers to something highly influential in shaping future ideas or events.'\n\n'tldr': A short, informal, punchy gloss on the meaning — the vibe of the word. Think of it as the TLDR a guy would text his friend. Examples: 'unhinged, way-too-invested confidence with zero self-awareness' (zealot) / 'something mildly inconvenient happens and he treats it like a CIA operation' (thwart). Keep it tight — one clause or sentence max.\n\n'example': 3-5 short, standalone sentences — like tweets or overheard moments. Absurd, specific, real. The word appears naturally in one of them. Style: 'Pretty sure the sauna at 6am is run by a cabal of shirtless men who nod but never speak.' / 'Seven beers in and suddenly he's a zealot for personal responsibility.' / 'The bartender cutting him off really thwarted his master plan.'",
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
