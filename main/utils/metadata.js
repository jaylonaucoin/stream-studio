/**
 * Metadata encoding utilities
 */

/**
 * Safely encode metadata values for ffmpeg
 * Ensures UTF-8 characters are properly handled
 * @param {string} value - The value to encode
 * @returns {string} Encoded value
 */
function encodeMetadataValue(value) {
  if (!value) return '';

  // Convert to string - Node.js strings are already UTF-8
  let encoded = String(value);

  // Remove null bytes or other problematic characters that could break ffmpeg
  encoded = encoded.replace(/\0/g, '');

  // Ensure proper UTF-8 encoding by converting to Buffer and back
  try {
    const buffer = Buffer.from(encoded, 'utf8');
    encoded = buffer.toString('utf8');
  } catch (e) {
    // If encoding fails, try to recover by replacing invalid characters
    encoded = encoded.replace(/[\uFFFD]/g, '');
  }

  return encoded;
}

module.exports = {
  encodeMetadataValue,
};
