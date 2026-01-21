/**
 * URL utilities for validation and normalization
 */

/**
 * Normalize URL - add protocol if missing
 * @param {string} url - The URL to normalize
 * @returns {string} Normalized URL
 */
function normalizeUrl(url) {
  let normalized = url.trim();

  // Remove any leading/trailing whitespace and newlines
  normalized = normalized.replace(/[\r\n]/g, '').trim();

  // If URL doesn't have a protocol, add https://
  if (normalized && !normalized.match(/^https?:\/\//i)) {
    // Check if it looks like a domain (has a dot and no spaces)
    if (normalized.includes('.') && !normalized.includes(' ')) {
      normalized = 'https://' + normalized;
    }
  }

  return normalized;
}

/**
 * Sanitize and validate URL input
 * @param {string} url - The URL to sanitize
 * @returns {string} Sanitized URL
 * @throws {Error} If URL is invalid
 */
function sanitizeUrl(url) {
  // Validate input type
  if (typeof url !== 'string') {
    throw new Error('Invalid URL type');
  }

  // Normalize the URL (add protocol if missing)
  const normalized = normalizeUrl(url);

  // Basic URL validation
  if (!normalized || normalized.length === 0) {
    throw new Error('URL cannot be empty');
  }

  // Ensure it starts with http:// or https://
  if (!/^https?:\/\//i.test(normalized)) {
    throw new Error('URL must start with http:// or https://');
  }

  // Validate URL structure
  try {
    const urlObj = new URL(normalized);

    // Must have a valid hostname with at least one dot
    if (!urlObj.hostname || !urlObj.hostname.includes('.')) {
      throw new Error('Invalid URL format');
    }

    // Block obviously invalid hostnames
    if (urlObj.hostname.length < 4) {
      throw new Error('Invalid URL hostname');
    }
  } catch (e) {
    if (e.message.includes('Invalid URL')) {
      throw e;
    }
    throw new Error('Invalid URL format');
  }

  return normalized;
}

module.exports = {
  normalizeUrl,
  sanitizeUrl,
};
