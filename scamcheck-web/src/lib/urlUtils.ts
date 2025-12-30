import unshortenMap from '@/data/unshortenMap.json';
import domainAgeData from '@/data/domainAgeMock.json';

/**
 * Extracts all URLs from a given text.
 * Trims punctuation from the end (.,).
 */
export const extractAllUrls = (text: string): string[] => {
  if (!text) return [];
  // Regex to capture http/https URLs.
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const matches = text.match(urlRegex);
  if (!matches) return [];

  return matches.map(url => {
      // Remove trailing punctuation that might have been captured
      return url.replace(/[.,;!?)]+$/, "");
  });
};

/**
 * Extracts the first URL from a given text.
 * Trims punctuation from the end (.,).
 */
export const extractFirstUrl = (text: string): string | null => {
  const urls = extractAllUrls(text);
  return urls.length > 0 ? urls[0] : null;
};

// Re-export for compatibility if needed, or deprecate
export const extractUrl = extractFirstUrl;

/**
 * Validates if the string is a valid URL with http or https protocol.
 */
export const isValidUrl = (url: string): boolean => {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
        return false;
    }
};

/**
 * Returns the domain of the URL for preview purposes.
 */
export const getDomain = (url: string): string | null => {
    try {
        const parsed = new URL(url);
        return parsed.hostname;
    } catch {
        return null;
    }
};

/**
 * Checks if the URL is an IP address.
 */
export const isIpAddress = (url: string): boolean => {
    try {
        // We only care about the hostname part for IP check
        // If url is just "127.0.0.1", new URL might fail if no protocol.
        // So we try to handle both full URL and just host.
        let hostname = url;
        try {
             const parsed = new URL(url);
             hostname = parsed.hostname;
        } catch {
            // treat as raw string
        }

        // IPv4 regex (simplified but strict enough for this context)
        // 0-255.0-255.0-255.0-255
        // (Note: this simple regex doesn't validate 0-255 range strictly, but good enough for classification)
        const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
        return ipRegex.test(hostname);
    } catch {
        return false;
    }
};

/**
 * Checks if the domain is punycode (starts with xn--).
 */
export const isPunycode = (hostname: string): boolean => {
    return hostname.startsWith('xn--');
};

/**
 * Simulation of URL Unshortener.
 * Returns the expanded URL if found in local map, otherwise returns original URL.
 */
export const resolveShortUrlMock = (url: string): string => {
    if (!url) return url;

    // Normalize input to strip protocol for lookup
    const cleanInput = url.replace(/^https?:\/\//, '');

    // Check if any key in map is contained in the input
    const map = unshortenMap as Record<string, string>;

    for (const [short, expanded] of Object.entries(map)) {
        if (cleanInput.includes(short)) {
            return expanded;
        }
    }

    return url;
};

/**
 * Simulation of Domain Age Check.
 * Returns age in days or null if unknown.
 */
export const getDomainAgeMock = (hostname: string): number | null => {
    const data = domainAgeData as Record<string, number>;
    if (hostname in data) {
        return data[hostname];
    }
    // Check if it's a subdomain of a known domain
    const parts = hostname.split('.');
    if (parts.length > 2) {
        const rootDomain = parts.slice(-2).join('.');
        if (rootDomain in data) {
            return data[rootDomain];
        }
    }

    // Deterministic simulation for unknown domains based on hash
    // This ensures consistency across runs for same domain
    let hash = 0;
    for (let i = 0; i < hostname.length; i++) {
        hash = ((hash << 5) - hash) + hostname.charCodeAt(i);
        hash |= 0;
    }
    const absHash = Math.abs(hash);

    // Simulate: 20% very new (<30 days), 20% medium (<180 days), 60% old
    const mod = absHash % 100;
    if (mod < 20) return absHash % 30; // 0-29 days
    if (mod < 40) return 30 + (absHash % 150); // 30-179 days

    return null; // Assume old/safe-ish or unknown for majority
};
