import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  test: {
    projects: [
      {
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.{test,spec}.{js,jsx}'],
          setupFiles: ['./tests/setup/renderer-setup.js'],
        },
      },
      {
        test: {
          name: 'main',
          environment: 'node',
          globals: true,
          include: ['main/**/*.{test,spec}.js'],
          pool: 'forks',
          setupFiles: ['./tests/setup/main-setup.js'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.{js,jsx}', 'main/**/*.js'],
      exclude: [
        '**/node_modules/**',
        '**/*.{test,spec}.js',
        '**/*.{test,spec}.jsx',
        '**/*.config.js',
        '**/dist/**',
        '**/dist-renderer/**',
        'src/test-utils/**',
      ],
      thresholds: {
        lines: 29,
        statements: 29,
        functions: 31,
        branches: 56,
        'src/utils/validation.js': {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 80,
        },
        'src/utils/ipcResult.js': {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 80,
        },
        'src/lib/queueStorage.js': {
          lines: 80,
          statements: 80,
          functions: 80,
          branches: 80,
        },
        'main/services/history.js': {
          lines: 65,
          statements: 65,
          functions: 55,
          branches: 50,
        },
        'main/services/settings.js': {
          lines: 68,
          statements: 68,
          functions: 58,
          branches: 35,
        },
      },
    },
  },
});
