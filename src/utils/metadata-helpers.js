/**
 * Normalize tag values from IPC for table display (trim; arrays → "; ").
 * @param {unknown} val
 * @returns {string}
 */
export function normalizeTagDisplay(val) {
  if (val == null) return '';
  if (Array.isArray(val)) {
    const parts = val
      .map((x) => (x == null ? '' : String(x).trim()))
      .filter((s) => s !== '');
    return parts.join('; ');
  }
  return String(val).trim();
}
