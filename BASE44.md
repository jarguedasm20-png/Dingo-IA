# Base44 Integration Notes

This project is structured as a React + Vite app with Dingo UI isolated in reusable components under `src/`.

For a beginner-friendly import checklist, read `BASE44_IMPORT_GUIDE.md`.

## Frontend

- Entry point: `index.html`
- React mount: `src/main.jsx`
- Main assistant component: `src/DingoApp.jsx`
- Shared styles: `styles.css`
- Static images: `public/assets/`

## AI Calls

The frontend calls `VITE_DINGO_AI_ENDPOINT` when it is set, otherwise it uses `/api/ai` for local development. API keys must stay server-side only.

Use one of these server options:

- `server.js` for local Node hosting.
- `api/ai.js` for serverless-style hosting.
- `base44/functions/dingoAi/entry.ts` for Base44.

Required environment variables:

```bash
GEMINI_API_KEY=your-server-side-key
GEMINI_MODEL=gemini-2.5-flash
VITE_DINGO_AI_ENDPOINT=/functions/dingoAi
```

Do not create `VITE_GEMINI_API_KEY` or any frontend-exposed key.

## Local Commands

```bash
npm install
npm run dev
npm run server
npm run build
```

During local development, Vite serves the React app on `http://127.0.0.1:5173` and proxies `/api` to `http://127.0.0.1:4173`.
