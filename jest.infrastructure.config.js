// Jest configuration for infrastructure tests.
// These tests verify repository structure and dependency versions after the PR
// that removed python-publish.yml, environment.yml, and updated package versions.
// No adapter-specific globalSetup/globalTeardown is needed here.
module.exports = {
  testMatch: ['**/src/tests/infrastructure.test.js'],
  globalSetup: undefined,
  globalTeardown: undefined,
};