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

  // --- Category 1: Financial Threat (+40 Puan) ---
  const financialKeywords = [
      "iban", "eft", "havale", "işlem ücreti", "depozito", "gümrük vergisi",
      "transaction fee", "deposit", "customs tax", "wire transfer",
      "bearbeitungsgebühr", "zollgebühr", "überweisung"
  ];
  let financialDetected = false;
  for (const keyword of financialKeywords) {
      if (normalizedText.includes(keyword)) {
          if (!financialDetected) {
              totalSeverity += 40;
              financialDetected = true;
          }
          tags.add("financial_threat");
          reasons.push("financial_keywords"); // Ensure this key exists in translations or logic
          break;
      }
  }

  // --- Category 2: Urgency (+30 Puan) ---
  const urgencyKeywords = [
      "son 10 dk", "hemen", "iptal edilecek", "hesabınız kısıtlandı", "acil",
      "last 10 min", "immediately", "will be cancelled", "account restricted", "urgent",
      "letzte 10 min", "sofort", "storniert", "konto eingeschränkt", "dringend"
  ];
  let urgencyDetected = false;
  for (const keyword of urgencyKeywords) {
      if (normalizedText.includes(keyword)) {
          if (!urgencyDetected) {
              totalSeverity += 30;
              urgencyDetected = true;
          }
          tags.add("urgency");
          reasons.push("urgency_keywords");
          break;
      }
  }

  // Ensure locale exists in patterns, fallback to 'en' if not found
  const targetLocale = ['en', 'tr', 'de'].includes(locale) ? locale : 'en';

  let matchCount = 0;
  const MAX_MATCHES = 25; // Circuit breaker

  // Include existing JSON based rules but be careful not to double count significantly if already covered
  // OR treat JSON rules as supplementary
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

  // Edge Case - Temiz Metin: If no URL and no specific threat found, ensure 0
  // (Handled by initialization of totalSeverity = 0)
  // But wait, if we found existing JSON rules, score might be > 0.
  // The requirement says: "Eğer metinde URL yoksa ve sadece 'npm run build' gibi teknik/zararsız metin varsa, skor 0 olmalı"
  // This implies if no specific keywords or rules matched, it stays 0.

  // Cap score at 100
  const score = Math.min(100, Math.max(0, totalSeverity));

  return {
    score,
    reasons: Array.from(new Set(reasons)),
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

  // Category 3: Technical Manipulation - Shortener (+20 Puan)
  const shortenerDomains = ["bit.ly", "t.ly", "tinyurl.com", "goo.gl", "ow.ly", "is.gd", "buff.ly"];
  let isKnownShortener = false;
  try {
      const hostname = new URL(url).hostname;
      isKnownShortener = shortenerDomains.some(d => hostname.includes(d));
  } catch (e) { /* ignore */ }

  if (isShortened || isKnownShortener) {
      tags.add("url_shortener");
      tags.add("obfuscation");
      reasons.push("shortener");
      totalSeverity += 20; // Requirement: +20 Puan
  }

  // 2. Extract domain and hostname
  const domain = getDomain(expandedUrl);
  if (!domain) {
      return { score: 0, reasons: ["invalid_url"], tags: [] };
  }

  // 3. Whitelist Check (Reputation)
  const isAllowed = allowlist.some(safe => domain === safe || domain.endsWith('.' + safe));
  if (isAllowed) {
      tags.add("trusted_domain");
      // Even if trusted, if context is suspicious, we might warn, but let's keep it safe.
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

  // --- Category 3: Technical Manipulation ---

  // Homograph Attack (+60 Puan)
  if (isPunycode(domain)) {
      totalSeverity += 60; // Requirement: +60 Puan
      reasons.push("punycode");
      tags.add("homograph_risk");
  }

  // Simple Homograph visual check (paypaI vs paypal)
  // This is hard to do perfectly without a list of target brands, but we can check mixed lookalikes
  // or specific patterns if needed.
  // For now, Punycode is the main technical detector.
  // Requirement mentions "paypaI.com" (capital I).
  // We can add a simple check for common spoof targets in the string itself if needed.
  const commonSpoofs = [
    { target: "paypal", variants: ["paypaI", "paypai", "paypa1"] },
    { target: "google", variants: ["googIe", "googie", "g00gle"] },
    { target: "apple", variants: ["appIe", "appie", "app1e"] }
  ];

  for(const spoof of commonSpoofs) {
      for(const variant of spoof.variants) {
          if (domain.includes(variant)) {
               totalSeverity += 60;
               reasons.push("homograph_spoof");
               tags.add("homograph_risk");
               break;
          }
      }
  }


  // IP:Port Tespiti (Category 3)
  if (isIpAddress(expandedUrl)) {
      let ipRisk = false;

      // Check for port
      // URL object handles port extraction
      try {
          const urlObj = new URL(expandedUrl);
          if (urlObj.port) {
               const port = parseInt(urlObj.port, 10);
               if (port !== 80 && port !== 443) {
                   // Standard dışı port -> Direkt Yüksek Risk
                   totalSeverity += 70; // "Direkt Yüksek Risk" interpreted as critical points
                   reasons.push("suspicious_port");
                   tags.add("non_standard_port");
                   ipRisk = true;
               }
          }
      } catch (e) { /* invalid url format handled earlier */ }

      // If just IP without standard port issue, still risky
      if (!ipRisk) {
          totalSeverity += 50;
          reasons.push("ip_address_url");
      }
  }

  // Login Path (+50 Puan)
  if (/login|signin|verify|guvenlik|account|secure|update|bank/i.test(expandedUrl)) {
      totalSeverity += 50; // Requirement: +50 Puan
      reasons.push("login_keyword");
      tags.add("sensitive_path");
  }

  // 8. Regex Rules from JSON
  for (const rule of compiledUrlRules) {
    try {
        if (rule.compiledRegex.test(expandedUrl)) {
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
      const commonBrands = ['paypal', 'apple', 'google', 'amazon', 'facebook', 'microsoft', 'netflix', 'bank'];

      for (const brand of commonBrands) {
          if (lowerText.includes(brand + '.com') || lowerText.includes(brand + ' .com')) {
               if (!domain.includes(brand)) {
                   totalSeverity += 40;
                   reasons.push("domain_mismatch");
                   tags.add("impersonation");
                   break;
               }
          }
      }

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
