module.exports = {
  roots: ['<rootDir>/test'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: false,
  globals: {
    'ts-jest': {
      diagnostics: false,
      tsConfig: '<rootDir>/test.tsconfig.json',
    },
  },

  moduleNameMapper: {
    '@gny/(.*)$': '<rootDir>/packages/$1',
  },
};
