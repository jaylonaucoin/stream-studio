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
  mutate: ['src/utils/validation.js', 'src/utils/ipcResult.js'],
  testFiles: ['src/utils/validation.test.js', 'src/utils/ipcResult.test.js'],
  concurrency: 2,
  coverageAnalysis: 'perTest',
  reporters: ['html', 'clear-text', 'progress'],
  thresholds: { high: 80, low: 60, break: 50 },
};
