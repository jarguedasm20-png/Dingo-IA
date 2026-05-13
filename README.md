# Dingo App

React + Vite assistant widget for Monark Design Build.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Create `.env` from `.env.example` and add the server-side AI key used by your backend.

3. Run the backend API server:

```bash
npm run server
```

4. In another terminal, run Vite:

```bash
npm run dev
```

Vite runs on `http://127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:4173`.

## Production build

```bash
npm run build
npm start
```

The Node server serves `dist/` and handles `/api/ai`.

## Security

Do not place API keys in React components or frontend files. AI credentials are read from server environment variables only.

## Base44/GitHub readiness

- UI is implemented as React components in `src/DingoApp.jsx`.
- Embeddable custom element entry: `src/dingo-widget.jsx`.
- Static assets live in `public/assets`.
- Backend AI call is available in `server.js`, as a serverless-style function in `api/ai.js`, and as a Base44-ready function in `base44/functions/dingoAi/entry.ts`.
- Beginner import guide: `BASE44_IMPORT_GUIDE.md`.
- Embed guide: `BASE44_EMBED_GUIDE.md`.
- Monark website knowledge guide: `DINGO_KNOWLEDGE_SETUP.md`.
- Environment variables expected:
  - `GEMINI_API_KEY`
  - `GEMINI_MODEL`
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL`
  - `VITE_DINGO_AI_ENDPOINT` for Base44, usually `/functions/dingoAi`

## Monark Website Knowledge

Dingo's Base44 function can answer questions using local Monark website knowledge stored in:

```text
base44/functions/dingoAi/monarkKnowledge.json
base44/functions/dingoAi/monarkKnowledge.manual.json
```

See `DINGO_KNOWLEDGE_SETUP.md` for sync and editing instructions.

## Embed usage

After `npm run build`, include the widget in another site with:

```html
<script type="module" src="/dingo-widget.js"></script>
<dingo-app></dingo-app>
```
