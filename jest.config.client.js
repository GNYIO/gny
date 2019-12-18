module.exports = {
  preset: 'jest-puppeteer',
  roots: ['<rootDir>/test/browser/'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  collectCoverage: false,
  globals: {
    PATH: 'http://localhost:4444/',
    TIMEOUT: 60000,
    'ts-jest': {
      diagnostics: false,
      tsConfig: '<rootDir>/jest.tsconfig.json',
    },
  },

  moduleNameMapper: {
    '@gny/(.*)$': '<rootDir>/packages/$1',
  },
};
