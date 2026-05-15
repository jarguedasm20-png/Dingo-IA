# Dingo App Phased Implementation

This file keeps Dingo App changes staged so the widget stays stable.

## Phase 1 - Stabilize Current Chat Flow

Status: verified locally.

Scope:

- Keep the widget working.
- Keep the three quick action buttons working.
- Keep the input active after automatic responses.
- Keep `/functions/dingoAi` available.
- Preserve the current floating widget, Shadow DOM support, Base44 compatibility, and Quick Estimate tool.

Verification performed:

- `node --check app.js`
- `node --check server.js`
- `node --check api/ai.js`
- Local server responded at `http://127.0.0.1:4173/`.
- `/functions/dingoAi` returned HTTP 200.
- Quick actions opened the current conversation and left the input active:
  - `I want to build in Guanacaste`
  - `I already own land`
  - `I live outside Costa Rica`

Note: `npm run build` could not be executed in this Codex terminal because `npm` is not available in PATH.

## Phase 2 - Structured Backend Responses

Status: implemented and verified through `/functions/dingoAi`.

- Add typed response shape, for example:
  - `type`
  - `message`
  - `buttons`
  - `intent`
  - `sources`
- Parse JSON safely in the backend.
- If JSON parsing fails, return a safe plain message.
- Frontend should render only `message` and approved `buttons`.
- Preserve the current chat UI.

Verification performed:

- `/functions/dingoAi` returned HTTP 200 for a pricing question.
- Response included `message`, `intent`, `suggestedAction`, `buttons`, `leadNotes`, and `flags`.
- Pricing test returned `intent: pricing_question`.
- Pricing test returned `suggestedAction: open_quick_estimate`.
- Pricing test returned the `Open Quick Estimate`, `Send WhatsApp message`, and `Keep exploring` buttons.
- Frontend parsing was updated to render only user-facing `message` and `buttons`.
- Internal fields are stored/merged only for session logic and are not rendered as chat text.

## Phase 3 - Intelligent Intent Detection

TODO:

- Pricing questions -> Quick Estimate.
- Serious project questions -> Video Call.
- Light questions -> WhatsApp.
- Restricted technical questions -> joke and redirect.
- Long conversations -> suggest meeting.

## Phase 4 - Monark Website Knowledge Behavior

TODO:

- Always use Monark website knowledge first for Monark services, design, construction, process, pricing, or scope.
- Do not invent services, prices, timelines, warranties, or guarantees.
- If knowledge is missing, say so and suggest contacting Monark.

## Phase 5 - Contextual Bubbles

TODO:

- Keep only one bubble at a time.
- Add cooldown.
- Keep max 3 per session.
- Disable bubbles while chat is open.
- Keep behavior subtle and non-invasive.

## Phase 6 - UI Polish

TODO:

- WhatsApp-style chat background.
- Message bubble animations.
- Typing indicator polish.
- Light/dark background image based on user local time.
