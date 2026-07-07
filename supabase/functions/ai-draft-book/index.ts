// Generates draft book content (description, takeaways, why-read, 10 summary pages,
// 15 quiz questions with per-option explanations) using the Lovable AI Gateway.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a book-summary writing assistant for a self-improvement mobile app.
Given a book title, author, and category, produce a JSON object with these EXACT keys:

{
  "description": string (2-3 sentences, punchy, no fluff),
  "key_takeaways": string (5 bullet points as a single string, each on its own line prefixed with "• "),
  "why_read": string (2-3 sentences, motivational, second-person),
  "summary_pages": string[] (exactly 10 items, each 100-150 words, standalone readable, covering the book's core ideas progressively page by page),
  "quiz_questions": [
    {
      "q": string (a question drawn from the book's ideas),
      "options": [string, string, string, string] (4 plausible answers, each 3-12 words),
      "correct": 0|1|2|3 (index of the best answer),
      "explanation": string (1-2 sentences general explanation, fallback),
      "option_explanations": [string, string, string, string] (per-option feedback: why THIS option is excellent / partly right / off-base — 1 sentence each, addressing the reader)
    }
  ] (exactly 15 questions)
}

Rules:
- Return ONLY valid JSON. No markdown, no commentary.
- All text in clear, energetic English.
- Do NOT invent chapters that do not exist. Base content on the actual known ideas of the book.
- Quiz questions should test comprehension of the book's core ideas, not trivia.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { title, author, category } = await req.json();
    if (!title || !author) {
      return new Response(JSON.stringify({ error: "title and author are required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `Book title: ${title}\nAuthor: ${author}\nCategory: ${category ?? "Self Improvement"}\n\nProduce the JSON now.`;

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (res.status === 429) {
      return new Response(JSON.stringify({ error: "Rate limit hit. Try again in a moment." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (res.status === 402) {
      return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Lovable Cloud settings." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!res.ok) {
      const t = await res.text();
      return new Response(JSON.stringify({ error: `AI gateway error: ${t.slice(0, 300)}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data?.choices?.[0]?.message?.content ?? "{}";
    let draft: unknown;
    try {
      draft = typeof raw === "string" ? JSON.parse(raw) : raw;
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      draft = m ? JSON.parse(m[0]) : {};
    }

    return new Response(JSON.stringify({ draft }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
