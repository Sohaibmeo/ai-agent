export function NormalizeForMatch(str: string): string {
  return str
    .toLowerCase()
    // drop anything in parentheses: "almond butter (halal)" -> "almond butter "
    .replace(/\([^)]*\)/g, ' ')
    // replace non-alphanumeric with space
    .replace(/[^a-z0-9\s]/g, ' ')
    // collapse multiple spaces
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

  // generic -ies -> -y (cherries -> cherry)
  if (word.endsWith('ies')) {
    return word.slice(0, -3) + 'y';
  }

  // generic plural "s" -> singular (apples -> apple)
  if (word.endsWith('s') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}


function computeSingleSimilarity(a: string, b: string): number {
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
    'drumstick',
    'thigh',
    'breast',
    'fillet',
    'fillet', // double is fine
    'frozen',
    'canned',
    'added',
    'grade',
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

  // 1) Token overlap score (0..1)
  let intersection = 0;
  for (const t of setA) {
    if (setB.has(t)) intersection += 1;
  }
  const minSize = Math.min(setA.size, setB.size);
  const tokenScore = intersection / minSize;

  // 2) Character-based substring score for roots, e.g. "berry" vs "strawberry"
  const rootA = Singularize(normA.replace(/\s+/g, ''));
  const rootB = Singularize(normB.replace(/\s+/g, ''));

  let charScore = 0;
  if (rootA && rootB) {
    if (rootA.includes(rootB) || rootB.includes(rootA)) {
      const minLen = Math.min(rootA.length, rootB.length);
      const maxLen = Math.max(rootA.length, rootB.length);
      charScore = minLen / maxLen;
    }
  }

  // 3) Penalise very long candidate names for short queries
  //    e.g. "salt" vs "nuts, almonds, dry roasted, with salt added"
  const lenB = setB.size;
  const lengthPenalty = lenB > 0 ? Math.min((lenB - 1) * 0.1, 0.4) : 0; // up to -0.4
  const lengthFactor = 1 - lengthPenalty; // between 0.6 and 1.0

  const baseScore = Math.max(tokenScore, charScore);
  return baseScore * lengthFactor;
}

/**
 * Compare LLM ingredient name against both the full DB `name`
 * and optionally `similarity_name` and return the best score.
 */
export function ComputeNameSimilarity(
  llmName: string,
  dbName: string,
  dbSimilarityName?: string,
): number {
  const s1 = computeSingleSimilarity(llmName, dbName);
  const s2 = dbSimilarityName
    ? computeSingleSimilarity(llmName, dbSimilarityName)
    : 0;
  return Math.max(s1, s2);
}

