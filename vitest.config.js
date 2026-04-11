import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    projects: [
      {
        resolve: {
          alias: {
            [path.resolve(__dirname, 'assets/icon.png')]: path.resolve(
              __dirname,
              'tests/mocks/image-file.js'
            ),
          },
        },
        plugins: [react()],
        test: {
          name: 'renderer',
          environment: 'jsdom',
          globals: true,
          include: ['src/**/*.{test,spec}.{js,jsx}'],
          setupFiles: ['./tests/setup/renderer-setup.js', './tests/setup/axe-matchers.js'],
          deps: {
            optimizer: {
              web: {
                include: ['@testing-library/react'],
              },
            },
          },
        },
        assetsInclude: ['**/*.png'],
      },
      {
        test: {
          name: 'main',
          environment: 'node',
          globals: true,
          include: ['main/**/*.{test,spec}.js', 'tests/**/*.{test,spec}.js'],
          pool: 'forks',
          setupFiles: ['./tests/setup/main-setup.js'],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary', 'lcov'],
      include: ['src/**/*.{js,jsx}', 'main/**/*.js', 'shared/**/*.js'],
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
        lines: 60,
        statements: 60,
        functions: 50,
        branches: 58,
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
          branches: 37,
        },
        'shared/preload-logic.js': {
          lines: 85,
          statements: 85,
          functions: 85,
          branches: 75,
        },
        'main/utils/metadata.js': {
          lines: 90,
          statements: 90,
          functions: 100,
          branches: 85,
        },
        'main/window-load-target.js': {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 100,
        },
        'src/lib/localBatchMerge.js': {
          lines: 90,
          statements: 90,
          functions: 100,
          branches: 70,
        },
      },
    },
  },
});
