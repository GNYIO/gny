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
      tsConfig: {
        target: 'ES2016',
        module: 'commonjs',
        lib: ['es2015', 'es2016', 'es2017'],
        allowJs: true,
        checkJs: true,
        declaration: false,
        sourceMap: true,
        strict: false,
        noImplicitAny: false,
        strictNullChecks: false,
        noImplicitThis: false,
        alwaysStrict: false,
        noUnusedLocals: true,
        noImplicitReturns: false,
        esModuleInterop: false,
        inlineSourceMap: false,
        inlineSources: false,
      },
    },
  },
};
