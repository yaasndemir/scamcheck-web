import rulesData from '@/data/rules.json';

// Define types based on our JSON structure
export interface TextRule {
  id: string;
  severity: number;
  tags: string[];
  patterns: {
    [locale: string]: string[];
  };
}

export interface UrlRule {
  id: string;
  severity: number;
  tags: string[];
  regex: string;
}

interface RulesData {
  textRules: TextRule[];
  urlRules: UrlRule[];
}

export interface AnalysisResult {
  score: number; // 0-100 (higher is more likely a scam)
  reasons: string[];
  tags: string[];
}

// Pre-compiled URL rule to avoid re-compiling regex on every call
interface CompiledUrlRule extends UrlRule {
  compiledRegex: RegExp;
}

const rawRules: RulesData = rulesData as RulesData;

// Compile regexes once at module load time
const compiledUrlRules: CompiledUrlRule[] = rawRules.urlRules.map(rule => {
  try {
    return {
      ...rule,
      compiledRegex: new RegExp(rule.regex, 'i')
    };
  } catch (e) {
    console.warn(`Invalid regex for rule ${rule.id}:`, e);
    return null;
  }
}).filter((rule): rule is CompiledUrlRule => rule !== null);

/**
 * Analyzes text for scam indicators based on locale.
 * @param text The text content to analyze.
 * @param locale The locale ('en', 'tr', 'de'). Defaults to 'en'.
 * @returns AnalysisResult
 */
export function analyzeText(text: string, locale: string = 'en'): AnalysisResult {
  const reasons: string[] = [];
  const tags: Set<string> = new Set();
  let totalSeverity = 0;

  // Normalize text for case-insensitive matching
  const normalizedText = text.toLowerCase();

  // Ensure locale exists in patterns, fallback to 'en' if not found
  // If 'en' is also missing (unlikely given our data), skip
  const targetLocale = ['en', 'tr', 'de'].includes(locale) ? locale : 'en';

  for (const rule of rawRules.textRules) {
    const patterns = rule.patterns[targetLocale] || rule.patterns['en'];

    if (!patterns) continue;

    for (const pattern of patterns) {
      // Simple inclusion check. For more advanced matching, we could use regex with word boundaries
      if (normalizedText.includes(pattern.toLowerCase())) {
        reasons.push(`Detected suspicious pattern: "${pattern}" (${rule.id})`);
        rule.tags.forEach(tag => tags.add(tag));
        totalSeverity += rule.severity;
        break; // Count rule only once per text
      }
    }
  }

  // Cap score at 100
  const score = Math.min(100, totalSeverity);

  return {
    score,
    reasons,
    tags: Array.from(tags)
  };
}

/**
 * Analyzes a URL for scam indicators.
 * @param url The URL to analyze.
 * @returns AnalysisResult
 */
export function analyzeUrl(url: string): AnalysisResult {
  const reasons: string[] = [];
  const tags: Set<string> = new Set();
  let totalSeverity = 0;

  for (const rule of compiledUrlRules) {
    if (rule.compiledRegex.test(url)) {
      reasons.push(`Detected suspicious URL pattern: ${rule.id}`);
      rule.tags.forEach(tag => tags.add(tag));
      totalSeverity += rule.severity;
    }
  }

  // Cap score at 100
  const score = Math.min(100, totalSeverity);

  return {
    score,
    reasons,
    tags: Array.from(tags)
  };
}
