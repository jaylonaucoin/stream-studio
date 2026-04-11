import { render } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const testTheme = createTheme({ palette: { mode: 'dark' } });

export function renderWithMui(ui, options = {}) {
  const { theme = testTheme, ...rest } = options;
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>, rest);
}
