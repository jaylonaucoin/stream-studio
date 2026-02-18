/**
 * Custom hook for keyboard shortcuts
 */
import { useEffect, useCallback } from 'react';

/**
 * Hook for registering keyboard shortcuts
 * @param {Object} shortcuts - Object mapping key combinations to handlers
 * @param {Object} options - Configuration options
 * @param {boolean} options.enabled - Whether shortcuts are enabled (default: true)
 * @param {HTMLElement} options.target - Target element for events (default: window)
 */
export function useKeyboardShortcuts(shortcuts, { enabled = true, target = null } = {}) {
  const handleKeyDown = useCallback(
    (e) => {
      if (!enabled) return;

      // Build key combination string
      const modifiers = [];
      if (e.ctrlKey || e.metaKey) modifiers.push('ctrl');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');

      const key = e.key.toLowerCase();
      const combination = [...modifiers, key].join('+');

      // Check for matching shortcut
      const handler = shortcuts[combination] || shortcuts[key];
      if (handler) {
        e.preventDefault();
        handler(e);
      }
    },
    [shortcuts, enabled]
  );

  useEffect(() => {
    const eventTarget = target || window;
    eventTarget.addEventListener('keydown', handleKeyDown);
    return () => eventTarget.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown, target]);
}

/**
 * Predefined shortcut configurations for common use cases
 */
export const SHORTCUT_CONFIGS = {
  app: {
    'ctrl+k': 'openShortcuts',
    'ctrl+h': 'openHistory',
    'ctrl+q': 'openQueue',
    'ctrl+,': 'openSettings',
  },
  form: {
    enter: 'submit',
    escape: 'cancel',
  },
  dialog: {
    escape: 'close',
    'ctrl+enter': 'save',
  },
};

export default useKeyboardShortcuts;
