/**
 * Basename without final extension (renderer-safe; works with / and \\).
 * @param {string} filePath
 * @returns {string}
 */
export function fileStemFromPath(filePath) {
  if (!filePath || typeof filePath !== 'string') return '';
  const norm = filePath.replace(/\\/g, '/');
  const seg = norm.split('/').pop() || '';
  const i = seg.lastIndexOf('.');
  if (i <= 0) return seg;
  return seg.slice(0, i);
}
