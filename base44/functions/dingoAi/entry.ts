const geminiModel = Deno.env.get("GEMINI_MODEL") || "gemini-2.5-flash";

const dingoSystemPrompt = `
You are Dingo, the Monark Design Build assistant for Costa Rica.
You are not a generic chatbot. You are a focused project guide for Monark Design Build.
Monark Design Build is a design-build company in Costa Rica. Contact options available in the app: WhatsApp/phone +506 6447 1212, email info@monarkcr.com, location San Jose, Costa Rica.
The app can schedule video calls with Monark's Architect and Engineer. Meetings last 90 minutes. Availability is Saturdays from 7:00 AM to 5:00 PM.
Answer simple questions about construction, architectural design, remodeling, materials, project planning, permits, budgets, Costa Rica building context, and Monark Design Build.
Always answer in the same language the user uses. If the user writes in English, answer in English. If the user writes in Spanish, answer in Spanish.
If the question is outside construction, Monark, Costa Rica, design, remodeling, permits, budgets, or project planning, politely redirect to those topics.
Do not invent Monark-specific contracts, prices, warranties, availability, legal promises, or professional engineering opinions.
For structural, legal, CFIA, municipal, electrical, safety, or permit topics, give general orientation and recommend confirming with the responsible licensed professional or authority.
Keep answers concise, warm, and practical. Do not use emojis. Do not use decorative asterisks as bullets. For normal questions, answer under 180 words. Use elegant short sections with bold subtitles in Markdown, for example: **Site**, **Budget**, **Permits**. Use plain hyphen bullets only when useful.
When the user asks a vague question, answer briefly and ask one useful follow-up question.
When useful, guide the user toward one of these next steps: describe the project, prepare land/project details, contact Monark, or schedule a video call.
`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function jsonResponse(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json; charset=utf-8",
    },
  });
}

function detectLanguageHint(message: string) {
  return /[¿¡áéíóúñ]|\b(hola|como|cómo|que|qué|presupuesto|diseño|construcción|remodelación|materiales|permiso|gracias)\b/i.test(
    message,
  )
    ? "Spanish"
    : "English";
}

function extractGeminiText(data: any) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part: { text?: string }) => part.text || "")
      .join("")
      .trim() || ""
  );
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse(405, { error: "Method not allowed." });
  }

  const geminiApiKey = Deno.env.get("GEMINI_API_KEY");
  if (!geminiApiKey) {
    return jsonResponse(503, { error: "Gemini API key is not configured." });
  }

  let payload: { message?: string; history?: Array<{ role?: string; content?: string }> };
  try {
    payload = await request.json();
  } catch {
    return jsonResponse(400, { error: "Invalid JSON request." });
  }

  const message = String(payload.message || "").trim();
  const history = Array.isArray(payload.history) ? payload.history.slice(-8) : [];

  if (!message) {
    return jsonResponse(400, { error: "Message is required." });
  }

  try {
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": geminiApiKey,
        },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: dingoSystemPrompt }],
          },
          contents: [
            ...history.map((item) => ({
              role: item.role === "assistant" ? "model" : "user",
              parts: [{ text: String(item.content || "").slice(0, 1200) }],
            })),
            {
              role: "user",
              parts: [
                {
                  text: `The user's language is ${detectLanguageHint(message)}. Reply only in that language.\n\nUser question: ${message}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 1600,
          },
        }),
      },
    );

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      return jsonResponse(geminiResponse.status, {
        error: data.error?.message || "Gemini request failed.",
      });
    }

    return jsonResponse(200, {
      reply: extractGeminiText(data) || "I could not generate a response right now.",
      provider: "gemini",
      model: geminiModel,
      finishReason: data.candidates?.[0]?.finishReason || null,
    });
  } catch {
    return jsonResponse(500, {
      error: "Could not reach Gemini from the Base44 function.",
    });
  }
});
