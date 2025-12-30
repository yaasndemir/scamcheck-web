
/**
 * Extracts the first URL from a given text.
 * Trims punctuation from the end (.,).
 */
export const extractUrl = (text: string): string | null => {
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
