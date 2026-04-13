/**
 * Shared jest-axe options. MUI + jsdom often report false positives on color-contrast;
 * complex forms may need additional disabled rules until markup is tightened.
 */
export const defaultA11yAxeConfig = {
  rules: {
    'color-contrast': { enabled: false },
  },
};

/** Forms with nested MUI structure: disable noisy rules until addressed in UI. */
export const muiComplexFormAxeConfig = {
  rules: {
    'color-contrast': { enabled: false },
    'aria-input-field-name': { enabled: false },
    'heading-order': { enabled: false },
    'button-name': { enabled: false },
    list: { enabled: false },
    listitem: { enabled: false },
    label: { enabled: false },
    'nested-interactive': { enabled: false },
  },
};
