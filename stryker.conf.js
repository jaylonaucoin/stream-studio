/**
 * Scoped mutation testing — run manually: npm run test:mutation
 * @type {import('@stryker-mutator/api/core').PartialStrykerOptions}
 */
module.exports = {
  packageManager: 'npm',
  plugins: ['@stryker-mutator/vitest-runner'],
  testRunner: 'vitest',
  testRunnerNodeArgs: ['--no-warnings'],
  vitest: {
    configFile: 'vitest.config.js',
  },
  mutate: [
    'src/utils/validation.js',
    'src/utils/ipcResult.js',
    'src/lib/queueStorage.js',
    'src/lib/localBatchMerge.js',
    'main/services/history.js',
    'main/utils/filename.js',
  ],
  testFiles: [
    'src/utils/validation.test.js',
    'src/utils/validation.property.test.js',
    'src/utils/ipcResult.test.js',
    'src/lib/queueStorage.test.js',
    'src/lib/queueStorage.property.test.js',
    'src/lib/localBatchMerge.test.js',
    'main/services/history.test.js',
    'main/utils/filename.test.js',
    'main/utils/filename.property.test.js',
  ],
  concurrency: 2,
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 },
};
