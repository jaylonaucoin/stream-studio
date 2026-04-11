const path = require('path');

const repoRoot = __dirname;

/** @type {import('@playwright/test').PlaywrightTestConfig} */
module.exports = {
  testDir: path.join(repoRoot, 'e2e', 'specs'),
  fullyParallel: false,
  workers: 1,
  timeout: 120_000,
  expect: { timeout: 30_000 },
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
};
