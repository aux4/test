/**
 * Text similarity metrics — pure JS, no dependencies.
 */

/**
 * Levenshtein distance ratio (0-1). 1 = identical.
 */
function fuzzy(a, b) {
  if (a === b) return 1;
  if (!a.length || !b.length) return 0;

  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  const distance = dp[m][n];
  return 1 - distance / Math.max(m, n);
}

/**
 * Word-level cosine similarity (0-1). 1 = identical word distribution.
 */
function cosine(a, b) {
  const wordsA = tokenize(a);
  const wordsB = tokenize(b);

  if (wordsA.length === 0 && wordsB.length === 0) return 1;
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  const freqA = wordFrequency(wordsA);
  const freqB = wordFrequency(wordsB);

  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);

  let dot = 0;
  let magA = 0;
  let magB = 0;

  for (const word of allWords) {
    const va = freqA[word] || 0;
    const vb = freqB[word] || 0;
    dot += va * vb;
    magA += va * va;
    magB += vb * vb;
  }

  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

/**
 * Jaccard similarity (0-1). Word set intersection / union.
 */
function jaccard(a, b) {
  const setA = new Set(tokenize(a));
  const setB = new Set(tokenize(b));

  if (setA.size === 0 && setB.size === 0) return 1;

  let intersection = 0;
  for (const word of setA) {
    if (setB.has(word)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function tokenize(text) {
  return text.toLowerCase().match(/\b\w+\b/g) || [];
}

function wordFrequency(words) {
  const freq = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }
  return freq;
}

function computeSimilarity(metric, a, b) {
  switch (metric) {
    case 'fuzzy': return fuzzy(a, b);
    case 'cosine': return cosine(a, b);
    case 'jaccard': return jaccard(a, b);
    default: throw new Error(`Unknown similarity metric: ${metric}. Use fuzzy, cosine, or jaccard.`);
  }
}

module.exports = { computeSimilarity, fuzzy, cosine, jaccard };
