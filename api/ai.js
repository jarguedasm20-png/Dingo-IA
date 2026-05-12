const geminiModel = process.env.GEMINI_MODEL || "gemini-2.5-flash";

const dingoSystemPrompt = `
You are Dingo, the Monark Design Build assistant for Costa Rica.
You are a focused project guide for Monark Design Build, not a generic chatbot.
Answer in the same language the user uses.
Keep answers concise, elegant, practical, and related to construction, design, Costa Rica, Monark, planning, materials, permits, budgets, or project preparation.
Never expose or request API keys. Never invent Monark-specific contracts, prices, warranties, or legal commitments.
`;

function detectLanguageHint(message) {
  return /[¿¡áéíóúñ]|\b(hola|como|cómo|que|qué|presupuesto|diseño|construcción|remodelación|materiales|permiso|gracias)\b/i.test(
    message,
  )
    ? "Spanish"
    : "English";
}

function extractGeminiText(data) {
  return (
    data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text || "")
      .join("")
      .trim() || ""
  );
}

export default async function handler(request, response) {
  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed." });
    return;
  }

  if (!process.env.GEMINI_API_KEY) {
    response.status(503).json({ error: "Gemini API key is not configured." });
    return;
  }

  const message = String(request.body?.message || "").trim();
  const history = Array.isArray(request.body?.history) ? request.body.history.slice(-8) : [];

  if (!message) {
    response.status(400).json({ error: "Message is required." });
    return;
  }

  const geminiResponse = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": process.env.GEMINI_API_KEY,
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
    response.status(geminiResponse.status).json({
      error: data.error?.message || "Gemini request failed.",
    });
    return;
  }

  response.status(200).json({
    reply: extractGeminiText(data) || "I could not generate a response right now.",
    provider: "gemini",
    model: geminiModel,
    finishReason: data.candidates?.[0]?.finishReason || null,
  });
}
