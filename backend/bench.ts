// bench.ts
// Quick LLM benchmark for WalletWise (Ollama or OpenAI).
// Node 18+ (global fetch) + TSX recommended: `npx tsx bench.ts ...`

type Provider = "ollama" | "openai";

type BenchOptions = {
  provider: Provider;
  model: string;            // e.g., "llama3.2:3b-instruct" (ollama) or "gpt-4o-mini" (openai)
  host?: string;            // ollama host (default http://localhost:11434)
  openaiApiKey?: string;    // required if provider=openai
  iterations?: number;      // per prompt after warmup
  maxTokens?: number;       // generation cap
  temperature?: number;
};

// Simple token estimator (whitespace split) – good enough for throughput feel.
function estimateTokens(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length || 0;
}

function nowMs() {
  return performance.now();
}

async function runOllamaPrompt(model: string, prompt: string, host = "http://localhost:11434") {
  const url = `${host}/api/generate`;
  const body = {
    model,
    prompt,
    stream: true,             // stream to measure TTFT
    options: { temperature: 0, num_predict: 256 }, // tweak if needed
  };

  const t0 = nowMs();
  const res = await fetch(url, { method: "POST", body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
  if (!res.ok || !res.body) throw new Error(`Ollama HTTP ${res.status}`);

  const reader = res.body.getReader();
  let done = false;
  let firstChunkAt: number | null = null;
  let text = "";

  while (!done) {
    const { value, done: d } = await reader.read();
    done = d;
    if (value) {
      const chunk = new TextDecoder().decode(value);
      // Ollama streams NDJSON (lines with { "response": "..." })
      const lines = chunk.split("\n").filter(Boolean);
      for (const line of lines) {
        try {
          const j = JSON.parse(line);
          if (j.response) {
            if (!firstChunkAt) firstChunkAt = nowMs();
            text += j.response;
          }
        } catch { /* ignore partial JSON lines */ }
      }
    }
  }
  const t1 = nowMs();

  return {
    ttftMs: (firstChunkAt ?? t1) - t0,
    totalMs: t1 - t0,
    output: text,
  };
}

async function runOpenAIPrompt(model: string, prompt: string, apiKey?: string, maxTokens = 256, temperature = 0) {
  if (!apiKey) throw new Error("OPENAI_API_KEY missing for provider=openai");

  // Stream via Responses API (chat-style) – measure TTFT.
  const url = "https://api.openai.com/v1/chat/completions";
  const body = {
    model,
    temperature,
    max_tokens: maxTokens,
    stream: true,
    messages: [
      { role: "system", content: "You are a concise, helpful assistant." },
      { role: "user", content: prompt }
    ],
  };

  const t0 = nowMs();
  const res = await fetch(url, { method: "POST", headers: {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${apiKey}`
  }, body: JSON.stringify(body) });

  if (!res.ok || !res.body) {
    const txt = await res.text().catch(() => "");
    throw new Error(`OpenAI HTTP ${res.status} ${txt}`);
  }

  const reader = res.body.getReader();
  let firstChunkAt: number | null = null;
  let text = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (!value) continue;
    const chunk = new TextDecoder().decode(value);
    // Streamed Server-Sent Events with lines "data: {json}"
    const lines = chunk.split("\n").filter(l => l.startsWith("data: "));
    for (const l of lines) {
      const payload = l.replace(/^data:\s*/, "");
      if (payload === "[DONE]") continue;
      try {
        const j = JSON.parse(payload);
        const delta = j.choices?.[0]?.delta?.content ?? "";
        if (delta) {
          if (!firstChunkAt) firstChunkAt = nowMs();
          text += delta;
        }
      } catch { /* ignore */ }
    }
  }
  const t1 = nowMs();

  return {
    ttftMs: (firstChunkAt ?? t1) - t0,
    totalMs: t1 - t0,
    output: text,
  };
}

async function bench(opts: BenchOptions) {
  const {
    provider,
    model,
    host = "http://localhost:11434",
    openaiApiKey = process.env.OPENAI_API_KEY,
    iterations = 3,
    maxTokens = 256,
    temperature = 0,
  } = opts;

  const categorizerPrompt = `Merchant/description: "TfL Oyster top-up"; Amount: -20.00.
Choose a single category from: Groceries, Dining, Transport, Shopping, Bills, Subscriptions, Entertainment, Health, Education, Travel, Income, Other.
Return a one-sentence rationale.`;

  const coachPrompt = `Using these insights: {"anomalies":[{"category":"Dining","last7":42.3,"median4w":18.5}],
"subscriptions":[{"merchant":"Spotify","avgAmount":9.99,"cadenceDays":30}],
"whatIf":{"category":"Dining","cutPct":10,"delta":4.23,"newFreeToSpend":37.7}, "goal":30}
Write exactly 5 lines:
- Goal: ...
- Obstacle: ...
- Action: ...
- When/Where: ...
- Why it helps: ...
Be concrete.`;

  async function runOnce(prompt: string) {
    if (provider === "ollama") {
      return runOllamaPrompt(model, prompt, host);
    } else {
      return runOpenAIPrompt(model, prompt, openaiApiKey, maxTokens, temperature);
    }
  }

  console.log(`\n== Bench start ==`);
  console.log(`Provider: ${provider}`);
  console.log(`Model:    ${model}`);
  if (provider === "ollama") console.log(`Host:     ${host}`);
  console.log(`Iters:    ${iterations} (per prompt)\n`);

  // Warmup
  console.log("Warmup (categorizer)...");
  await runOnce(categorizerPrompt).catch(e => console.error("Warmup error:", e.message));

  const results: Array<{name: string; ttftMs: number; totalMs: number; tokPerSec: number}> = [];

  for (const [name, prompt] of [["Categorizer", categorizerPrompt], ["Coach", coachPrompt]] as const) {
    let ttft = 0, total = 0, toks = 0;
    for (let i = 0; i < iterations; i++) {
      const r = await runOnce(prompt);
      const tokens = estimateTokens(r.output);
      ttft += r.ttftMs;
      total += r.totalMs;
      toks += tokens;
      console.log(`${name} iter ${i+1}: TTFT=${r.ttftMs.toFixed(0)}ms Total=${r.totalMs.toFixed(0)}ms OutTokens≈${tokens}`);
    }
    const avgTtft = ttft / iterations;
    const avgTotal = total / iterations;
    const tokPerSec = toks / (total / 1000);
    results.push({ name, ttftMs: avgTtft, totalMs: avgTotal, tokPerSec });
  }

  console.log(`\n== Averages ==`);
  for (const r of results) {
    console.log(`${r.name}: TTFT=${r.ttftMs.toFixed(0)}ms  Total=${r.totalMs.toFixed(0)}ms  Throughput≈${r.tokPerSec.toFixed(1)} tok/s`);
  }

  // Simple verdicts
  const okCategorizer = results[0]?.tokPerSec >= 40 || results[0]?.totalMs <= 1200;
  const okCoach = results[1]?.tokPerSec >= 25 || results[1]?.totalMs <= 2500;

  console.log(`\n== Verdict ==`);
  console.log(`Categorizer: ${okCategorizer ? "✅ OK" : "⚠️ Slow"} (want ≥40 tok/s or ≤1.2s total)`);
  console.log(`Coach:       ${okCoach ? "✅ OK" : "⚠️ Slow"} (want ≥25 tok/s or ≤2.5s total)\n`);
}

// --- CLI ---
const provider = (process.argv[2] as Provider) ?? "ollama";
// Examples:
//   npx tsx bench.ts ollama llama3.2:3b-instruct
//   npx tsx bench.ts openai gpt-4o-mini
const model = process.argv[3] ?? (provider === "ollama" ? "llama3.2:3b-instruct" : "gpt-4o-mini");

bench({ provider, model })
  .catch(e => { console.error("Benchmark failed:", e); process.exit(1); });
