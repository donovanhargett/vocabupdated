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
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Pass the token explicitly — getUser() on a fresh client won't read global headers
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
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

    // Fetch the last 30 days of used words and idioms to avoid repetition
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { data: recentContent } = await supabase
      .from("daily_content")
      .select("word, idiom")
      .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
      .order("date", { ascending: false });

    const usedWords = (recentContent || []).map((r: any) => r.word).filter(Boolean);
    const usedIdioms = (recentContent || []).map((r: any) => r.idiom).filter(Boolean);

    const exclusionBlock = [
      usedWords.length ? `WORDS ALREADY USED (do not repeat or use synonyms of these): ${usedWords.join(", ")}` : "",
      usedIdioms.length ? `IDIOMS/PHRASES ALREADY USED (do not repeat, rephrase, or use a variation of these): ${usedIdioms.join(", ")}` : "",
    ].filter(Boolean).join("\n\n");

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
            content: `You are generating daily content for a curious, intelligent reader who works in or around business and tech. Every single day must produce COMPLETELY DIFFERENT content — no overlapping words, idioms, or topics.

${exclusionBlock ? `STRICT EXCLUSIONS — these have been used recently. You MUST pick something entirely different:\n${exclusionBlock}\n` : ""}

WORD OF THE DAY: Choose a sophisticated, uncommon word that Michael Tracey — the independent journalist known for contrarian foreign policy takes, media criticism, and on-the-ground conflict reporting — might use in his writing or tweets. Draw from: political science, philosophy, diplomacy, legal theory, classical rhetoric, historiography, military strategy. The word must be genuinely rare and precise — not just "eloquent" or "astute". Generate ALL of the following for it:

- 'word_definition': One formal, complete sentence. Buttoned-up dictionary style.
- 'word_tldr': A funny one-liner — a mini situation or character sketch, NOT synonyms. Examples: "something mildly inconvenient happens and he treats it like a CIA operation" / "seven beers in and suddenly he's a zealot for personal responsibility". One sentence, absurd, specific.
- 'word_pronunciation': Simple readable phonetic spelling. Uppercase the stressed syllable. Examples: "SEM-in-ul" / "THWORT" / "ih-KWIV-uh-kul". No IPA symbols.
- 'word_synonyms': Array of exactly 2 single-word synonyms that are easy to understand.
- 'word_example': Exactly 3 short sentences as a JSON array. EVERY sentence must use the word. Sentences 1 and 2: frat/lax bro world — drinking, house parties, pregames, tailgates, the gym, beer pong, group chats, Sunday Scaries, Uber home from the bar. Lowercase fine, punchy and funny. Sentence 3: professional/corporate — a sharp exec or consultant using the word naturally in a meeting or email, no forced definitions.

IDIOM/PHRASE OF THE DAY: Choose a phrase or expression that David Sacks — tech investor, All-In Podcast co-host, and former PayPal exec — actually uses or would use. His vocabulary spans: VC deal dynamics, political commentary, media criticism, power structures, regulatory fights, and tech strategy. Pick from a WIDE variety of his registers — not just geopolitical phrases. Examples of the type of variety to draw from:
- Deal/investing: "cram-down round", "down-round financing", "bridge to nowhere", "party round", "broken cap table"
- Power/institutions: "regulatory capture", "controlled opposition", "agency capture", "the permanent class", "the administrative state"
- Media/narrative: "manufactured consent", "the laptop story", "memory-holed", "blue-check consensus"
- Tech/strategy: "winner-take-all", "toll road business", "flywheel effect", "the death of the middle", "consumerization of enterprise"
- General wit: "follow the incentives", "show me the incentives", "the scoreboard doesn't lie", "the map is not the territory"
Pick something FRESH that is NOT a variation of anything already used. Include what it means and a sharp example of him saying it.

TOPIC OF THE DAY: This is a mini deep dive — think Chamath Palihapitiya's Substack deep dives. Pick one SPECIFIC, CONCRETE concept or process from these domains (rotate through them, never repeat a domain used in the last 7 days): neurotech, artificial intelligence, oil & gas, computing architecture, intelligence/geopolitics, biotech, energy infrastructure, defense tech, financial systems. Pick a specific mechanism or process — NOT a broad overview. Good examples: how upstream oil drilling works, how a transformer attention mechanism processes a token, how brain-computer interfaces read neural signals, how a CPU out-of-order execution pipeline works, how SIGINT collection and tasking works, how mRNA vaccines are manufactured, how HVDC power transmission works, how autonomous weapons targeting systems work, how dark pools work, how synthetic biology protein folding tools function.

Generate five sections:

1. 'topic_explanation': 4-6 sentences. Clear and precise, written for a smart generalist with zero background. Explain exactly what it is and how it works mechanically.

2. 'topic_why_it_matters': 3-4 sentences. Why does this topic matter RIGHT NOW? What is the real-world consequence, the business angle, the geopolitical angle, or the societal shift this concept is driving? Make it feel urgent and relevant.

3. 'topic_first_principles': 4-6 sentences. Strip the jargon away entirely. What are the fundamental laws, forces, or logic that make this thing work or not work? Start from physics, economics, biology, or pure logic — whatever is most appropriate — and build up to the concept. Think: what would Feynman write if he had to explain the core mechanic to a physicist from a different field?

4. 'topic_questions': A JSON array of exactly 4 strings. Sharp, specific questions the reader should go research. Not generic ("What is X?") but pointed and investigative ("Why does X fail under Y condition?", "Who controls the chokepoint for Z?"). Each question should open a rabbit hole.

5. 'topic_feynman': 2-3 sentences. Explain it like the reader is in 5th grade. One vivid analogy. Zero jargon.

Return ONLY a JSON object with keys: "word", "word_definition", "word_tldr", "word_pronunciation", "word_synonyms", "word_example", "idiom", "idiom_explanation", "idiom_example", "topic_title", "topic_explanation", "topic_why_it_matters", "topic_first_principles", "topic_questions", "topic_feynman"`,
          },
          {
            role: "user",
            content: `Generate for date: ${contentDate}. Make everything completely unique — different word, different idiom category, different topic domain than recent days.`,
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
        word_pronunciation: result.word_pronunciation || "",
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

    // Add the word of the day to the user's review deck (skip if already there)
    const { data: existingWord } = await supabase
      .from("vocab_words")
      .select("id")
      .eq("user_id", user.id)
      .ilike("word", result.word)
      .maybeSingle();

    if (!existingWord) {
      const wordExample = Array.isArray(result.word_example)
        ? result.word_example.join(" ")
        : result.word_example || "";
      const wordSynonyms = Array.isArray(result.word_synonyms)
        ? result.word_synonyms.join(", ")
        : result.word_synonyms || "";

      await supabase.from("vocab_words").insert({
        user_id: user.id,
        word: result.word,
        definition: result.word_definition,
        pronunciation: result.word_pronunciation || "",
        tldr: result.word_tldr || "",
        synonyms: wordSynonyms,
        example_sentence: wordExample,
        next_review_date: new Date().toISOString(),
      });
    }

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
