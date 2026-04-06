module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node', 'svelte'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.(js|jsx|svelte)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!svelte)'
  ]
};