import unshortenMap from '@/data/unshortenMap.json';
import domainAgeData from '@/data/domainAgeMock.json';

/**
 * Extracts the first URL from a given text.
 * Trims punctuation from the end (.,).
 */
export const extractFirstUrl = (text: string): string | null => {
  if (!text) return null;
  // Regex to capture http/https URLs.
  // We use a somewhat inclusive regex then clean up
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const match = text.match(urlRegex);
  if (!match) return null;

  let url = match[0];
  // Remove trailing punctuation that might have been captured (e.g. "Visit google.com.")
  url = url.replace(/[.,;!?)]+$/, "");
  return url;
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
        const { hostname } = new URL(url);
        // IPv4 regex (simplified)
        return /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname);
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
    // Check exact match (without protocol if needed, but map keys are likely loose)
    // For simplicity, let's try to match keys in the map with the input URL
    // We normalize by removing protocol for key lookup if map has no protocol,
    // but our mock map has keys like "bit.ly/scam1".

    // Normalize input to strip protocol for lookup
    const cleanInput = url.replace(/^https?:\/\//, '');

    // Check if any key in map is contained in the input
    // This is a simple mock implementation
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
    return null; // Unknown
};
