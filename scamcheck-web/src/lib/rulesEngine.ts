import rulesData from '@/data/rules.json';
import { allowlist, blocklist } from '@/data/reputation';
import { getDomain, getDomainAgeMock, resolveShortUrlMock, isPunycode, isIpAddress } from './urlUtils';

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
  analyzedUrl?: string; // The actual URL analyzed (after expansion)
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

  if (!text || !text.trim()) {
    return { score: 0, reasons: [], tags: [] };
  }

  // Performance guard: truncate if too long
  const MAX_LENGTH = 10000;
  let textToAnalyze = text;
  if (text.length >= MAX_LENGTH) {
      textToAnalyze = text.slice(0, MAX_LENGTH);
      reasons.push(`input_too_long`); // Use ID for i18n
      tags.add("truncated");
  }

  // Normalize text for case-insensitive matching
  const normalizedText = textToAnalyze.toLowerCase();

  // Ensure locale exists in patterns, fallback to 'en' if not found
  const targetLocale = ['en', 'tr', 'de'].includes(locale) ? locale : 'en';

  let matchCount = 0;
  const MAX_MATCHES = 25; // Circuit breaker

  for (const rule of rawRules.textRules) {
      if (matchCount >= MAX_MATCHES) break;

    const patterns = rule.patterns[targetLocale] || rule.patterns['en'];

    if (!patterns) continue;

    for (const pattern of patterns) {
      try {
        if (normalizedText.includes(pattern.toLowerCase())) {
          reasons.push(rule.id);
          rule.tags.forEach(tag => tags.add(tag));
          totalSeverity += rule.severity;
          matchCount++;
          break; // Count rule only once per text
        }
      } catch (e) {
        // Safe guard
        console.error("Rule matching error", e);
      }
    }
  }

  // Cap score at 100
  const score = Math.min(100, Math.max(0, totalSeverity));

  return {
    score,
    reasons,
    tags: Array.from(tags)
  };
}

/**
 * Analyzes a URL for scam indicators.
 * @param url The URL to analyze.
 * @param messageText Optional message text to check for mismatches.
 * @returns AnalysisResult
 */
export function analyzeUrl(url: string, messageText?: string): AnalysisResult {
  const reasons: string[] = [];
  const tags: Set<string> = new Set();
  let totalSeverity = 0;

  if (!url) return { score: 0, reasons: [], tags: [] };

  // 1. Unshorten simulation
  const expandedUrl = resolveShortUrlMock(url);
  const isShortened = expandedUrl !== url;
  if (isShortened) {
      tags.add("url_shortener");
      reasons.push("shortener");
      // Add a small risk for using a shortener
      totalSeverity += 10;
  }

  // 2. Extract domain and hostname
  const domain = getDomain(expandedUrl);
  if (!domain) {
      return { score: 0, reasons: ["invalid_url"], tags: [] };
  }

  // 3. Whitelist Check (Reputation)
  // Check strict equality or subdomain
  const isAllowed = allowlist.some(safe => domain === safe || domain.endsWith('.' + safe));
  if (isAllowed) {
      tags.add("trusted_domain");
      return {
          score: 5, // Non-zero to show it was analyzed
          reasons: ["trusted_domain_match"],
          tags: Array.from(tags),
          analyzedUrl: expandedUrl
      };
  }

  // 4. Blacklist Check
  const isBlocked = blocklist.some(bad => domain === bad || domain.endsWith('.' + bad));
  if (isBlocked) {
      totalSeverity += 80;
      reasons.push("blacklist_match");
      tags.add("malicious_domain");
  }

  // 5. Domain Age Check
  const ageDays = getDomainAgeMock(domain);
  if (ageDays !== null) {
      if (ageDays < 30) {
          totalSeverity += 30;
          reasons.push("new_domain"); // < 30 days
          tags.add("newly_registered");
      } else if (ageDays < 180) {
          totalSeverity += 10;
          // Medium age
      }
  }

  // 6. Punycode / Homograph (Basic)
  if (isPunycode(domain)) {
      totalSeverity += 60; // Increased from 20 to 60 as per requirements
      reasons.push("punycode");
      tags.add("homograph_risk");
  }

  // Advanced Homograph/Mixed Character detection (Regex based)
  // Assuming "mixed_script" rule handles Cyrillic/Latin mix

  // 7. IP Address + Port + Login Logic (Requirement P0.3)
  if (isIpAddress(expandedUrl)) {
      totalSeverity += 50; // Base penalty for IP usage
      // Check for port
      if (/:\d+/.test(expandedUrl)) {
          // Check if port is not 80 or 443
          const portMatch = expandedUrl.match(/:(\d+)/);
          if (portMatch) {
              const port = parseInt(portMatch[1], 10);
              if (port !== 80 && port !== 443) {
                  totalSeverity += 30;
                  reasons.push("port_in_url");
              }
          }
      }

      // Check for sensitive paths in IP URL
      if (/login|signin|verify|update|secure|account|bank/i.test(expandedUrl)) {
          totalSeverity += 40;
          reasons.push("login_keyword");
          tags.add("phishing_ip");
      }

      reasons.push("ip_address_url");
  }

  // 8. Regex Rules
  for (const rule of compiledUrlRules) {
    try {
        if (rule.compiledRegex.test(expandedUrl)) {
          // Avoid duplicate reasons if already added by custom logic above
          if (!reasons.includes(rule.id)) {
              reasons.push(rule.id);
              rule.tags.forEach(tag => tags.add(tag));
              totalSeverity += rule.severity;
          }
        }
    } catch (e) {
        console.error("URL rule regex error", e);
    }
  }

  // 9. Heuristic: Text vs URL Mismatch
  if (messageText) {
      const lowerText = messageText.toLowerCase();
      // Simple heuristic: if text mentions a high-profile domain but the URL is different
      const commonBrands = ['paypal', 'apple', 'google', 'amazon', 'facebook', 'microsoft', 'netflix', 'bank'];

      for (const brand of commonBrands) {
          // If text says "paypal.com" explicitly
          if (lowerText.includes(brand + '.com') || lowerText.includes(brand + ' .com')) {
               if (!domain.includes(brand)) {
                   totalSeverity += 40;
                   reasons.push("domain_mismatch");
                   tags.add("impersonation");
                   break;
               }
          }
      }

      // Also check if @ exists in URL (basic credential harvesting pattern)
      if (expandedUrl.includes('@')) {
          totalSeverity += 50;
          if (!reasons.includes("at_symbol")) {
              reasons.push("at_symbol");
          }
          tags.add("credential_harvesting");
      }
  }

  // Cap score at 100
  const score = Math.min(100, Math.max(0, totalSeverity));

  return {
    score,
    reasons: Array.from(new Set(reasons)), // Dedupe
    tags: Array.from(tags),
    analyzedUrl: expandedUrl
  };
}
