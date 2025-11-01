# Walletwise

A behavioral finance analysis tool powered by LLMs.

## Setup

1. Copy `.env.example` to `.env` and add your OpenAI API key.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run locally:
   ```bash
   npm run local
   ```
4. Start API server:
   ```bash
   npm start
   ```

## Files
- `src/steps/`: Pipeline steps
- `src/pipeline.ts`: Orchestrates steps sequentially and emits progress events
- `src/runLocal.ts`: Local runner
- `src/server.ts`: Express API (REST + streaming NDJSON endpoint)
- `rules.json`: Keyword rules
- `test_data/tx.csv`: Example transaction data

Some things to run :
CSV_PATH=test_data/baseline_week.csv          TIME_WINDOW=week  GOAL=30  npm run dev
CSV_PATH=test_data/subscriptions_heavy.csv    TIME_WINDOW=week  GOAL=30  npm run dev
CSV_PATH=test_data/transport_spike_month.csv  TIME_WINDOW=month GOAL=120 npm run dev
CSV_PATH=test_data/sparse_week_big_dining.csv TIME_WINDOW=week  GOAL=30  npm run dev
CSV_PATH=test_data/mixed_large.csv            TIME_WINDOW=month GOAL=120 npm run dev
