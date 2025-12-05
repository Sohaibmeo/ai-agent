export function NormalizeForMatch(str: string): string {
  let s = str.toLowerCase();

  // Basic synonym / variant normalisation
  s = s.replace(/yoghurt/g, 'yogurt');
  s = s.replace(/low-fat/g, 'low fat');
  s = s.replace(/lowfat/g, 'low fat');
  s = s.replace(/semi-skimmed/g, 'low fat');
  s = s.replace(/skimmed/g, 'nonfat'); // skimmed milk ≈ nonfat
  s = s.replace(/wholemeal/g, 'whole wheat');

  // drop anything in parentheses: "almond butter (halal)" -> "almond butter "
  s = s.replace(/\([^)]*\)/g, ' ');

  // replace non-alphanumeric with space
  s = s.replace(/[^a-z0-9\s]/g, ' ');

  // collapse multiple spaces
  s = s.replace(/\s+/g, ' ').trim();

  return s;
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
    'style', // e.g. "Greek-style yogurt"
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

  let score = Math.max(tokenScore, charScore) * lengthFactor;

  // 4) Penalise flour/juice/oil/etc when query does not mention them
  const penaltyKeywords = ['flour', 'juice', 'oil', 'powder', 'syrup', 'meal'];

  const tokensAArray = Array.from(setA);
  const tokensBArray = Array.from(setB);

  for (const kw of penaltyKeywords) {
    const inA = tokensAArray.includes(kw);
    const inB = tokensBArray.includes(kw);
    if (!inA && inB) {
      score *= 0.8; // small, stackable penalties
    }
  }

  return score;
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
