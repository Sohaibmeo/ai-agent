# Walletwise Studio (Frontend)

Interactive frontend for visualising the Walletwise agent pipeline end-to-end. Upload a transaction CSV, trace each agent hop (rules, LLM, reconciliation, insights, coach), and review the generated guidance.

## Getting started

```bash
npm install
npm run dev
```

The app assumes the backend runs at `http://localhost:3000`. Point it elsewhere by exporting `VITE_API_URL` before launching:

```bash
VITE_API_URL=https://my-walletwise-api.example.com npm run dev
```

Verbose traces (`?verbose=1`) are requested automatically so the UI can render per-step payloads.

## Feature highlights

- Drag & drop CSV upload with inline editor (paste tweaks or load the bundled sample).
- Period and goal selectors wired to the LangGraph inputs (week/month windows).
- Pipeline timeline: inspect what each step produced, from parsing through coaching.
- Insights dashboard showing category totals, subscription detections, anomalies, what-if savings, and the final advice script.
- Optional raw JSON drawer for debugging or exporting payloads.

## Scripts

| Command           | Purpose                                  |
| ----------------- | ---------------------------------------- |
| `npm run dev`     | Start the Vite development server (HMR)  |
| `npm run build`   | Type-check and build the production app  |
| `npm run preview` | Preview the production build locally     |
| `npm run lint`    | Lint the codebase with ESLint            |

## Project layout

```
src/
  components/      Reusable UI pieces (uploader, timeline, panels)
  hooks/           API orchestration (`useAnalyze`)
  types/           Shared API contracts mirroring backend types
  utils/           Formatting helpers for currency/snippets
  App.tsx          Page composition and state management
```

## Ideas for iteration

- Stream backend progress (SSE/websocket) to animate the timeline in real time.
- Persist analysis history so runs can be compared or exported later.
- Layer in charts (Recharts/Nivo) for spend trends or goal tracking.
