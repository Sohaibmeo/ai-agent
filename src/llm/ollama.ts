export async function ollamaGenerate(model: string, prompt: string, numPredict = 256) {
  const tag = model.replace(/^ollama\//, "");
  const resp = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ model: tag, prompt, stream: false, options: { temperature: 0, num_predict: numPredict } })
  });
  if (!resp.ok) throw new Error(`Ollama ${resp.status}`);
  const json = await resp.json();
  return (json.response as string).trim();
}
