/**
 * Test utilities for Azure DevOps migration tests
 */

/**
 * Check if integration tests should run
 * @returns {boolean} true if integration tests should run
 */
function shouldRunIntegrationTests() {
  return process.env.AZURE_DEVOPS_INTEGRATION_TESTS === 'true' &&
         process.env.AZURE_DEVOPS_PAT &&
         process.env.AZURE_DEVOPS_ORG &&
         process.env.AZURE_DEVOPS_PROJECT;
}

/**
 * Skip test if it requires Azure DevOps integration
 * @param {Function} testFn - The test function
 * @returns {Function} Wrapped test function that skips if integration not available
 */
function requiresAzureDevOps(testFn) {
  if (!shouldRunIntegrationTests()) {
    return function skip() {
      this.skip('Requires Azure DevOps integration environment');
    };
  }
  return testFn;
}

/**
 * Describe block that only runs with Azure DevOps integration
 * @param {string} name - Test suite name
 * @param {Function} fn - Test suite function
 * @returns {Function} describe or describe.skip
 */
function describeIntegration(name, fn) {
  if (!shouldRunIntegrationTests()) {
    return describe.skip(`${name} - REQUIRES AZURE DEVOPS INTEGRATION`, fn);
  }
  return describe(name, fn);
}

module.exports = {
  shouldRunIntegrationTests,
  requiresAzureDevOps,
  describeIntegration
};