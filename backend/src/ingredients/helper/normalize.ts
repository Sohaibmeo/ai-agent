export function NormalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    // remove punctuation
    .replace(/[^a-z0-9\s]/g, ' ')
    // collapse spaces
    .replace(/\s+/g, ' ')
    .trim();
}

// Very simple English singularization for food words
export function Singularize(word: string): string {
  if (!word) return word;

  // berries -> berry
  if (word.endsWith('berries')) {
    return word.slice(0, -3); // drop "ies" => "berry"
  }

  // tomatoes -> tomato, potatoes -> potato
  if (word.endsWith('oes')) {
    return word.slice(0, -2); // drop "es"
  }

  // generic -ies -> -y  (applies for things like "berries", "cherries")
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }

  // generic plural "s" -> singular (apples -> apple)
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

export function ComputeNameSimilarity(a: string, b: string): number {
  const normA = NormalizeForMatch(a);
  const normB = NormalizeForMatch(b);

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
    'boneless',
    'breast',
    'thigh',
    'drumstick',
  ]);

  const tokensA = normA
    .split(' ')
    .filter((t) => t && !stopwords.has(t))
    .map((t) => Singularize(t));

  const tokensB = normB
    .split(' ')
    .filter((t) => t && !stopwords.has(t))
    .map((t) => Singularize(t));

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  if (setA.size === 0 || setB.size === 0) return 0;

  // 1) Token overlap score (like Jaccard on min side)
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const minSize = Math.min(setA.size, setB.size);
  const tokenScore = intersection / minSize; // 0..1

  // 2) Character-based overlap on roots as a backup
  //   This helps "berry" vs "strawberry", etc.
  const rootA = Singularize(normA.replace(/\s+/g, ''));
  const rootB = Singularize(normB.replace(/\s+/g, ''));

  let charScore = 0;
  if (rootA && rootB) {
    // check substring relation
    if (rootA.includes(rootB) || rootB.includes(rootA)) {
      const minLen = Math.min(rootA.length, rootB.length);
      const maxLen = Math.max(rootA.length, rootB.length);
      charScore = minLen / maxLen; // e.g. "berry" vs "strawberry" ≈ 5/10 = 0.5
    }
  }

  return Math.max(tokenScore, charScore);
}
