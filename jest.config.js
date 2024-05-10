/** @type {import('ts-jest').JestConfigWithTsJest} */

module.exports = {
  cache: false,
  verbose: true,
  setupFiles: ['./jest.polyfills.js'],
  setupFilesAfterEnv: ['jest-extended/all'],

  // https://github.com/prisma/prisma/issues/17171#issuecomment-1643931883
  // was hitting out of memory errors when running unit tests
  workerIdleMemoryLimit: '512MB',

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
