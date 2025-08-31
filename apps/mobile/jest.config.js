/** @type {import('@jest/types').Config.ProjectConfig} */
module.exports = {
  // Use the official Expo preset which configures Babel/transformers correctly for Expo 53/RN 0.79
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/test/setup.ts'],
  // Ignore RN native folders and our top-level test helpers folder to avoid ESM transform issues in Expo's runtime
  testPathIgnorePatterns: [
    '/node_modules/',
    '<rootDir>/ios/',
    '<rootDir>/android/',
    '<rootDir>/test/',
  ],
  // Only run tests under __tests__ to avoid legacy *.test files causing transform issues
  testMatch: ['**/__tests__/**/*.[jt]s?(x)'],
}
