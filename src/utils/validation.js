/**
 * Validation utilities for metadata and form fields
 */

/**
 * Validates metadata fields and returns an object with error messages
 * @param {Object} meta - Metadata object to validate
 * @returns {Object} Object with field names as keys and error messages as values
 */
export function validateMetadata(meta) {
  const errors = {};
  const currentYear = new Date().getFullYear();

  if (meta.year) {
    const yearNum = parseInt(meta.year, 10);
    if (isNaN(yearNum) || yearNum < 1900 || yearNum > currentYear + 1) {
      errors.year = `Year must be between 1900 and ${currentYear + 1}`;
    }
  }

  if (meta.trackNumber && meta.totalTracks) {
    const trackNum = parseInt(meta.trackNumber, 10);
    const totalNum = parseInt(meta.totalTracks, 10);
    if (!isNaN(trackNum) && !isNaN(totalNum) && trackNum > totalNum) {
      errors.trackNumber = `Track number cannot exceed total tracks (${totalNum})`;
    }
  }

  if (meta.bpm) {
    const bpmNum = parseInt(meta.bpm, 10);
    if (isNaN(bpmNum) || bpmNum < 1 || bpmNum > 300) {
      errors.bpm = 'BPM must be between 1 and 300';
    }
  }

  return errors;
}

/**
 * Check if a URL is a valid HTTP/HTTPS URL
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid URL
 */
export function isValidHttpUrl(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Check if a string is a valid positive integer
 * @param {string} value - Value to check
 * @returns {boolean} True if valid positive integer
 */
export function isValidPositiveInteger(value) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num > 0 && num.toString() === value;
}

/**
 * Check if a string represents a valid year
 * @param {string} value - Year value to check
 * @param {number} minYear - Minimum valid year (default: 1900)
 * @param {number} maxYear - Maximum valid year (default: current year + 1)
 * @returns {boolean} True if valid year
 */
export function isValidYear(value, minYear = 1900, maxYear = new Date().getFullYear() + 1) {
  const num = parseInt(value, 10);
  return !isNaN(num) && num >= minYear && num <= maxYear;
}
