# Dingo Monark Website Knowledge Setup

Dingo can answer questions about Monark using a local website knowledge base stored with the backend function.
The frontend never calls OpenAI directly and never receives an API key.

## Where The Knowledge Lives

Primary synced knowledge:

```text
base44/functions/dingoAi/monarkKnowledge.json
```

Manual fallback knowledge:

```text
base44/functions/dingoAi/monarkKnowledge.manual.json
```

Use the manual file for approved Monark information that is not easy to crawl, or when Base44 cannot run the crawler.

## How The Backend Uses It

The Base44 function is:

```text
base44/functions/dingoAi/entry.ts
```

When a user asks Dingo a question:

1. The frontend sends the message to `VITE_DINGO_AI_ENDPOINT`.
2. In Base44, set that endpoint to `/functions/dingoAi`.
3. The function loads `monarkKnowledge.json` and `monarkKnowledge.manual.json`.
4. It searches for the most relevant chunks.
5. It sends only those relevant chunks to OpenAI.
6. OpenAI answers using Monark website knowledge as the main source of truth.

If a detail is not in the knowledge base, Dingo is instructed to say that it does not have that specific detail from Monark's website yet and suggest contacting Monark.

## Environment Variables

Keep these server-side only:

```text
OPENAI_API_KEY=your-server-side-openai-key
OPENAI_MODEL=gpt-4o-mini
```

Frontend variable:

```text
VITE_DINGO_AI_ENDPOINT=/functions/dingoAi
```

Do not create `VITE_OPENAI_API_KEY`.
Do not place an OpenAI key in React, Vite, HTML, or JavaScript served to the browser.

## How To Sync Monark Website Content

The crawler script is:

```text
scripts/syncMonarkKnowledge.ts
```

It tries to read:

```text
https://monarkcr.com/sitemap.xml
```

If a sitemap is not available, it starts from the homepage and crawls internal Monark links.

Run with Deno:

```bash
deno run --allow-net --allow-read --allow-write scripts/syncMonarkKnowledge.ts
```

The script extracts:

- Page title
- URL
- Headings
- Clean text
- Searchable chunks

Then it writes the result to:

```text
base44/functions/dingoAi/monarkKnowledge.json
```

## Manual Updates

When you need to add approved information manually, edit:

```text
base44/functions/dingoAi/monarkKnowledge.manual.json
```

Add a new object inside `chunks`:

```json
{
  "id": "manual-example",
  "url": "https://monarkcr.com/",
  "title": "Approved Monark Information",
  "headings": ["Manual Knowledge"],
  "keywords": ["design", "construction", "consultation"],
  "text": "Paste approved Monark information here."
}
```

Keep manual entries factual and approved. Do not add private notes, internal pricing, credentials, passwords, or API keys.

## Questions To Test

Try:

- What services does Monark offer?
- Can Monark help me design a house in Costa Rica?
- What is Monark's design philosophy?
- How can I contact Monark?
- Does Monark work with tropical architecture?
- Can Monark help with construction?
- What makes Monark different?
- Que servicios ofrece Monark?
- Monark puede ayudarme con una casa en Guanacaste?
- Como puedo contactar a Monark?

## Expected Answer Style

Dingo should:

- Answer in the user's language when possible.
- Sound warm, premium, concise, and professional.
- Prioritize Monark website content.
- Avoid inventing unsupported prices, schedules, warranties, legal claims, or technical guarantees.
- Recommend contacting Monark or scheduling a consultation when the question needs confirmation.

## Future Improvement

This first version uses simple local JSON search. Later, if the website becomes larger, Dingo can be upgraded with embeddings and a vector database. That is not required for the current Base44 version.
