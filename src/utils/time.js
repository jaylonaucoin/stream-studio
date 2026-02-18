/**
 * Time formatting and parsing utilities
 */

/**
 * Parse timestamp string (MM:SS or H:MM:SS) to seconds
 * @param {string} timeStr - Time string to parse
 * @returns {number|null} Seconds or null if invalid
 */
export const parseTimeToSeconds = (timeStr) => {
  if (!timeStr || typeof timeStr !== 'string') return null;

  const trimmed = timeStr.trim();
  if (!trimmed) return null;

  // Try parsing as pure seconds (1-2 digit numbers, e.g., "45" or "9")
  if (/^\d{1,2}$/.test(trimmed)) {
    return parseInt(trimmed, 10);
  }

  // Try parsing MM:SS or HH:MM:SS
  const parts = trimmed.split(':').map((p) => parseFloat(p.trim()));

  if (parts.some(isNaN)) return null;

  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    if (minutes < 0 || seconds < 0 || seconds >= 60) return null;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // H:MM:SS format
    const [hours, minutes, seconds] = parts;
    if (hours < 0 || minutes < 0 || minutes >= 60 || seconds < 0 || seconds >= 60) return null;
    return hours * 3600 + minutes * 60 + seconds;
  }

  return null;
};

/**
 * Format seconds to MM:SS or HH:MM:SS string
 * @param {number} totalSeconds - Total seconds to format
 * @returns {string} Formatted time string
 */
export const formatSecondsToTime = (totalSeconds) => {
  if (totalSeconds === null || totalSeconds === undefined || isNaN(totalSeconds)) return '';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = Math.floor(totalSeconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
};

/**
 * Format duration from seconds to human readable string (e.g., "3:45")
 * Same as formatSecondsToTime but exported with a more descriptive name
 * @param {number} seconds - Duration in seconds
 * @returns {string} Formatted duration
 */
export const formatDuration = formatSecondsToTime;
