export function isIpcFailure(res) {
  return res && typeof res === 'object' && res.success === false;
}

export function historyItemsFromResponse(res) {
  if (res && res.success === true && Array.isArray(res.items)) return res.items;
  return [];
}

export function historyErrorFromResponse(res) {
  if (res && res.success === false) return res.error || 'Failed to load history';
  return null;
}
