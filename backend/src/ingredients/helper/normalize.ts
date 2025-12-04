export async function NormalizeForMatch(str: string): Promise<string> {
  return str
    .toLowerCase()
    // remove punctuation
    .replace(/[^a-z0-9\s]/g, ' ')
    // collapse spaces
    .replace(/\s+/g, ' ')
    .trim();
}

export async function ComputeNameSimilarity(a: string, b: string): Promise<number> {
  const normA = await NormalizeForMatch(a);
  const normB = await NormalizeForMatch(b);

  if (!normA || !normB) return 0;

  const stopwords = new Set([
    'raw',
    'cooked',
    'fresh',
    'peeled',
    'with',
    'skin',
    'without',
    'no',
    'and',
    'or',
    'from',
    'juice',
    'sliced',
    'chopped',
    'ground',
    'whole',
    'medium',
    'large',
    'small',
  ]);

  const tokensA = new Set(
    normA.split(' ').filter((t) => t && !stopwords.has(t)),
  );
  const tokensB = new Set(
    normB.split(' ').filter((t) => t && !stopwords.has(t)),
  );

  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersection = 0;
  for (const t of tokensA) {
    if (tokensB.has(t)) intersection += 1;
  }

  const minSize = Math.min(tokensA.size, tokensB.size);
  return intersection / minSize; // in [0,1]; 1 = perfect match
}
