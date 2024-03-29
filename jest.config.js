/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  cache: false,
  verbose: true,
  setupFiles: ['./jest.polyfills.js'],
  setupFilesAfterEnv: ['jest-extended/all'],

  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        // tsconfig: 'tsconfig.json',
        useESM: true,
        tsconfig: 'jest.tsconfig.json',
      },
    ],
  },
};
