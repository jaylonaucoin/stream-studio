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
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}', 'main/**/*.js'],
      exclude: [
        '**/node_modules/**',
        '**/*.{test,spec}.js',
        '**/*.config.js',
        '**/dist/**',
        '**/dist-renderer/**',
      ],
    },
  },
});
