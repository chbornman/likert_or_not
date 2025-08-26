// Test configuration for different test suites

export const testConfig = {
  // Skip E2E tests if running in CI or without browsers
  skipE2E: process.env.SKIP_E2E === 'true' || !process.env.DISPLAY,
  
  // Test timeouts
  timeouts: {
    unit: 5000,
    integration: 10000,
    e2e: 30000
  },
  
  // Test patterns
  patterns: {
    unit: ['src/**/__tests__/**/*.test.{ts,tsx}'],
    integration: ['src/services/__tests__/**/*.test.{ts,tsx}'],
    e2e: ['test/e2e/**/*.test.{ts,tsx}']
  }
};