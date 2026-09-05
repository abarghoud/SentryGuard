module.exports = {
  displayName: 'mobile',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['<rootDir>/src/**/*(*.)@(spec|test).[jt]s?(x)'],
  coverageDirectory: 'test-output/jest/coverage',
  moduleNameMapper: {
    '\\.(wav|mp3|ogg|caf|aiff|png|jpg|jpeg|gif|svg)$': '<rootDir>/src/testing/file-mock.js',
  },
  transform: {
    '^.+\\.[tj]sx?$': ['ts-jest', { isolatedModules: true, tsconfig: { jsx: 'react-jsx' } }],
  },
};
