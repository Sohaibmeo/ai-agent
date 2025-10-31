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
- `src/graph.ts`: State graph definition
- `src/runLocal.ts`: Local runner
- `src/server.ts`: Fastify API
- `rules.json`: Keyword rules
- `test_data/tx.csv`: Example transaction data
