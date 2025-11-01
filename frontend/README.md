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

- Persist analysis history so runs can be compared or exported later.
- Layer in charts (Recharts/Nivo) for spend trends or goal tracking.
- Provide inline editing/override of categorisations with instant recompute.

## Next Progress and Goals

- Capture per-step timings and error metrics alongside the streaming feed so ops can spot slow or flaky agents at a glance.
- Enrich insights with historical trend charts, envelope-style budgets, and multi-period comparisons for deeper context.
- Personalise the coach: store user goals, surface habit triggers, and schedule reminders or commitments tied to advice.
- Expand ingestion beyond CSV by wiring in bank connectors (Plaid/TrueLayer) and scheduled sync jobs with secure storage.
- Experiment with hybrid categorisation (rules + feedback-trained models) to reduce LLM calls and learn from corrections.
- Automate guardrails with configurable alerts when categories overshoot budgets, real-time notifications, and calendar/task integrations for follow-through.
