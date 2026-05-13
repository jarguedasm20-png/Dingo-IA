# Base44 Static Widget Export Guide

This guide prepares Dingo App as a static widget package that Base44 can load from:

```text
/dingo/dingo-widget.js
```

The widget remains isolated with Shadow DOM and keeps the current Dingo visual design, avatar, animations, buttons, typography, and floating behavior.

## Build The Base44 Package

From the Dingo-IA project folder, run:

```bash
npm install
npm run build:base44
```

This runs the Vite build and then creates:

```text
base44-export/dingo/dingo-widget.js
base44-export/dingo/assets/
base44-export/test.html
```

## Copy Into Base44

Copy this generated folder:

```text
base44-export/dingo/
```

Into the Base44 project public folder so the final Base44 structure is:

```text
public/dingo/dingo-widget.js
public/dingo/assets/
```

Base44 should then be able to resolve:

```text
/dingo/dingo-widget.js
```

## HTML Embed Snippet

Use this when Base44 allows custom HTML:

```html
<script type="module" src="/dingo/dingo-widget.js"></script>
<dingo-app asset-base="/dingo/"></dingo-app>
```

Dingo appears automatically in the bottom-right corner in its minimized floating state.

The widget defaults to `/functions/dingoAi` for AI calls. If needed, you can set it explicitly:

```html
<script type="module" src="/dingo/dingo-widget.js"></script>
<dingo-app asset-base="/dingo/" ai-endpoint="/functions/dingoAi"></dingo-app>
```

## React Loader Component

If Base44 prefers component-based integration, use:

```text
base44/DingoBase44Embed.jsx
```

Import and render it once near the root of the Base44 page or layout:

```jsx
import DingoBase44Embed from "./DingoBase44Embed";

export default function Page() {
  return (
    <>
      <YourPageContent />
      <DingoBase44Embed />
    </>
  );
}
```

The component:

- Dynamically loads `/dingo/dingo-widget.js` in the browser.
- Avoids adding duplicate script tags.
- Mounts `<dingo-app asset-base="/dingo/" ai-endpoint="/functions/dingoAi">`.
- Does not use an iframe.
- Does not create extra page layout space.
- Keeps Dingo floating in the bottom-right corner.

## Local Export Test

After running:

```bash
npm run build:base44
```

Open:

```text
base44-export/test.html
```

It loads the widget with:

```html
<script type="module" src="./dingo/dingo-widget.js"></script>
<dingo-app asset-base="./dingo/"></dingo-app>
```

This confirms that Dingo works even from a subfolder.

## Backend AI Endpoint

The frontend should keep using:

```text
VITE_DINGO_AI_ENDPOINT=/functions/dingoAi
```

The OpenAI key must remain server-side only:

```text
OPENAI_API_KEY
OPENAI_MODEL
```

Do not create `VITE_OPENAI_API_KEY`.
Do not put an OpenAI key in frontend code.

## Backend Function

Keep the Base44 backend function here:

```text
base44/functions/dingoAi/entry.ts
```

That function calls OpenAI server-side and uses the Monark website knowledge JSON files.
