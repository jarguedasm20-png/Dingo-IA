# Base44 Embed Guide: Dingo App

This project now includes an isolated, embeddable Dingo App widget.

The standalone React/Vite app still works normally. The embed version is an additional build output and does not replace the original app.

For the recommended Base44 static package workflow, see `BASE44_EXPORT_GUIDE.md`. It generates `base44-export/dingo/dingo-widget.js` and `base44-export/dingo/assets/` so Base44 can load `/dingo/dingo-widget.js` reliably.

## What Gets Built

After running:

```bash
npm install
npm run build
```

Vite creates:

```text
dist/dingo-widget.js
dist/assets/
```

`dingo-widget.js` registers this custom HTML element:

```html
<dingo-app></dingo-app>
```

## Base44 Snippet

Use this snippet in a Base44 custom HTML/code block, adjusting the script path to wherever Base44 serves the built file:

```html
<script type="module" src="/dingo-widget.js"></script>
<dingo-app></dingo-app>
```

If the widget files are hosted in a subfolder, use:

```html
<script type="module" src="/path-to-dingo/dingo-widget.js"></script>
<dingo-app asset-base="/path-to-dingo/"></dingo-app>
```

## Monark Website Snippet

If the Monark website hosts the built files at `/dingo/`, use:

```html
<script type="module" src="/dingo/dingo-widget.js"></script>
<dingo-app asset-base="/dingo/"></dingo-app>
```

## Why Shadow DOM Is Used

The widget uses Shadow DOM so the parent website cannot accidentally change Dingo App styles.

This protects:

- colors
- spacing
- typography
- buttons
- avatar images
- animations
- fixed corner widget layout

## Required Environment Variables In Base44

Set these server-side variables for the Base44 backend function:

```bash
OPENAI_API_KEY=your-openai-key
OPENAI_MODEL=gpt-4o-mini
VITE_DINGO_AI_ENDPOINT=/functions/dingoAi
```

Important:

- Do not put `OPENAI_API_KEY` in the frontend.
- Do not create `VITE_OPENAI_API_KEY`.
- `VITE_DINGO_AI_ENDPOINT` is safe because it is only the function URL.

## Backend Function

The Base44-ready function is:

```text
base44/functions/dingoAi/entry.ts
```

The frontend calls:

```text
/functions/dingoAi
```

The function calls OpenAI from the server side.

## Files To Upload To Base44/GitHub

Include:

- `src/`
- `public/assets/`
- `base44/functions/dingoAi/`
- `styles.css`
- `vite.config.js`
- `package.json`
- `index.html`

Do not upload:

- `.env`
- `node_modules/`
- `dist/` unless Base44 asks for a static upload instead of building from source
- logs
- API keys

## Notes

The widget preserves the existing Dingo App visual design. The only technical difference in embed mode is that the blank standalone page layer is hidden inside the Shadow DOM so it does not create extra space inside the parent website.
