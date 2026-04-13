// Jest configuration for infrastructure tests.
// These tests do not require the adapter-specific globalSetup used by src/adaptors/test.js.
module.exports = {
  testMatch: ['**/src/tests/infrastructure.test.js'],
};