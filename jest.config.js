/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  testEnvironment: 'node',
  cache: false,

  extensionsToTreatAsEsm: ['.ts', '.tsx', '.mts'],
  transform: {
    '^.+\\.tsx?$': [
      'ts-jest',
      {
        tsconfig: 'tsconfig.json',
        useESM: true,
        tsconfig: {
          module: 'ES2020',
          target: 'ES2020',
          moduleResolution: 'node16',
          esModuleInterop: true,
        },
      },
    ],
  },

  // moduleNameMapper: {
  //   '@gny/(.*)$': '<rootDir>/packages/$1',
  // },
};
