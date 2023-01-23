/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  moduleNameMapper: {
    uuid: require.resolve('uuid'),
  },
  cache: false,
  verbose: true,
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
